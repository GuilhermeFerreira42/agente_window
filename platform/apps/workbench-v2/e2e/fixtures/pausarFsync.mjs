// Somente no processo descartável deste E2E: pausa o fsync de um stage
// quando o teste cria o marcador. Não há rota ou opção de produto associada.
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { syncBuiltinESMExports } from 'node:module'
import process from 'node:process'
import { setTimeout } from 'node:timers'
const dir = process.env.MMI_FSYNC_FIXTURE
if (dir) {
  const abrir = fsp.open
  fsp.open = async function (arquivo, flags, ...resto) {
    const handle = await abrir.call(this, arquivo, flags, ...resto)
    if (flags === 'r+' && /[\\/]\.stages[\\/]/.test(String(arquivo))) {
      const sync = handle.sync.bind(handle)
      handle.sync = async () => {
        if (fs.existsSync(path.join(dir, 'ativar')) && !fs.existsSync(path.join(dir, 'entrou'))) {
          fs.writeFileSync(path.join(dir, 'entrou'), 'fsync')
          const inicio = Date.now()
          while (!fs.existsSync(path.join(dir, 'liberar'))) {
            if (Date.now() - inicio > 15000) throw new Error('Barreira fsync expirou')
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        }
        return sync()
      }
    }
    return handle
  }
  syncBuiltinESMExports()
}
