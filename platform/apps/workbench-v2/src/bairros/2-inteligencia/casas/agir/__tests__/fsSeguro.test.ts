import { link, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { Worker } from 'node:worker_threads'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { abrirRaizDiscoSegura, fsSeguroDisponivel } from '../server/fsSeguro'

const describeNative = describe.skipIf(!fsSeguroDisponivel)
let base = ''
let raiz = ''
let fora = ''

beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'agir-f2-native-'))
  raiz = path.join(base, 'workspace')
  fora = path.join(base, 'outside')
  await mkdir(raiz)
  await mkdir(fora)
})

afterEach(async () => {
  await rm(base, { recursive: true, force: true })
})

describeNative('helper F2 — openat2, sem fallback pathname', () => {
  it('lê/lista com descritor fixado e não segue symlinks', async () => {
    await writeFile(path.join(raiz, 'ok.txt'), 'interno', 'utf8')
    await writeFile(path.join(fora, 'segredo.txt'), 'FORA-DO-WORKSPACE', 'utf8')
    await symlink(fora, path.join(raiz, 'atalho'))
    const fs = abrirRaizDiscoSegura(raiz)!
    try {
      expect(fs.readFile('ok.txt').toString('utf8')).toBe('interno')
      expect(fs.readDirectory('.').find((item) => item.name === 'atalho')?.kind).toBe('symlink')
      expect(() => fs.readFile('atalho/segredo.txt')).toThrow()
      expect(() => fs.readDirectory('atalho')).toThrow()
    } finally {
      fs.close()
    }
  })

  it('nega traversal, caminho absoluto, links finais e hardlinks', async () => {
    await writeFile(path.join(fora, 'secret.txt'), 'FORA-DO-WORKSPACE', 'utf8')
    await symlink(path.join(fora, 'secret.txt'), path.join(raiz, 'link.txt'))
    await link(path.join(fora, 'secret.txt'), path.join(raiz, 'hard.txt'))
    const fs = abrirRaizDiscoSegura(raiz)!
    try {
      expect(() => fs.readFile('../outside/secret.txt')).toThrow()
      expect(() => fs.readFile(path.join(fora, 'secret.txt'))).toThrow()
      expect(() => fs.readFile('link.txt')).toThrow()
      expect(() => fs.readFile('hard.txt')).toThrow()
      expect(() => fs.writeAtomic('link.txt', Buffer.from('alterado'))).toThrow()
      expect(() => fs.writeAtomic('hard.txt', Buffer.from('alterado'))).toThrow()
      expect(await readFile(path.join(fora, 'secret.txt'), 'utf8')).toBe('FORA-DO-WORKSPACE')
    } finally {
      fs.close()
    }
  })

  it('cria em subpastas sem substituir e reescreve por staging + renameat2', async () => {
    const fs = abrirRaizDiscoSegura(raiz)!
    try {
      fs.createExclusive('sub/pasta/novo.txt', Buffer.from('primeiro'))
      expect(await readFile(path.join(raiz, 'sub/pasta/novo.txt'), 'utf8')).toBe('primeiro')
      expect(() => fs.createExclusive('sub/pasta/novo.txt', Buffer.from('sobrescrever'))).toThrow()
      expect(await readFile(path.join(raiz, 'sub/pasta/novo.txt'), 'utf8')).toBe('primeiro')
      fs.writeAtomic('sub/pasta/novo.txt', Buffer.from('segunda versão'))
      expect(fs.readFile('sub/pasta/novo.txt').toString('utf8')).toBe('segunda versão')
    } finally {
      fs.close()
    }
  })

  it('não atravessa uma troca concorrente de diretório por symlink', async () => {
    const slot = path.join(raiz, 'slot')
    const held = path.join(raiz, 'held')
    await mkdir(slot)
    await writeFile(path.join(slot, 'segredo.txt'), 'INTERNO', 'utf8')
    await writeFile(path.join(fora, 'segredo.txt'), 'FORA-DO-WORKSPACE', 'utf8')
    const fs = abrirRaizDiscoSegura(raiz)!
    const estado = new Int32Array(new SharedArrayBuffer(12))
    const worker = new Worker(`
      const fs = require('node:fs');
      const { workerData } = require('node:worker_threads');
      const { raiz, fora, estado } = workerData;
      const slot = raiz + '/slot';
      const held = raiz + '/held';
      try { fs.renameSync(slot, held); } catch {}
      try { fs.symlinkSync(fora, slot); } catch {}
      Atomics.store(estado, 1, 1);
      while (Atomics.load(estado, 2) === 0 && Atomics.load(estado, 0) === 0) {
        Atomics.wait(estado, 2, 0, 20);
      }
      while (Atomics.load(estado, 0) === 0) {
        try {
          let isLink = false;
          try { isLink = fs.lstatSync(slot).isSymbolicLink(); } catch {}
          if (isLink) {
            fs.unlinkSync(slot);
            try { fs.renameSync(held, slot); } catch {}
          } else {
            try { fs.renameSync(slot, held); } catch {}
            try { fs.symlinkSync(fora, slot); } catch {}
          }
        } catch {}
      }
      try { if (fs.lstatSync(slot).isSymbolicLink()) fs.unlinkSync(slot); } catch {}
      try { fs.renameSync(held, slot); } catch {}
    `, { eval: true, workerData: { raiz, fora, estado } })
    try {
      for (let tentativa = 0; tentativa < 200; tentativa += 1) {
        if (Atomics.load(estado, 1) === 1) break
        await new Promise((resolve) => setTimeout(resolve, 2))
      }
      expect(() => fs.readFile('slot/segredo.txt')).toThrow()
      Atomics.store(estado, 2, 1)
      Atomics.notify(estado, 2)
      let vazamentos = 0
      let bloqueios = 0
      for (let tentativa = 0; tentativa < 500; tentativa += 1) {
        try {
          if (fs.readFile('slot/segredo.txt').toString('utf8') === 'FORA-DO-WORKSPACE') vazamentos += 1
        } catch {
          bloqueios += 1
        }
        try {
          fs.createExclusive('slot/invasao.txt', Buffer.from('não sair da raiz'))
        } catch {}
        try {
          fs.writeAtomic('slot/segredo.txt', Buffer.from('alteração confinada'))
        } catch {}
      }
      expect(vazamentos).toBe(0)
      expect(bloqueios).toBeGreaterThan(0)
      expect(await readFile(path.join(fora, 'segredo.txt'), 'utf8')).toBe('FORA-DO-WORKSPACE')
      await expect(readFile(path.join(fora, 'invasao.txt'), 'utf8')).rejects.toThrow()
    } finally {
      Atomics.store(estado, 0, 1)
      await worker.terminate()
      fs.close()
    }
    // Se a rotina concorrente ainda deixou um symlink no fixture, só a limpeza o remove.
    try {
      if ((await lstat(slot)).isSymbolicLink()) await rm(slot)
    } catch {}
    await rm(held, { recursive: true, force: true })
  })
})

it('mantém indisponível a API de disco até haver garantia contra rename concorrente', () => {
  expect(fsSeguroDisponivel).toBe(false)
  expect(abrirRaizDiscoSegura(raiz)).toBeNull()
})
