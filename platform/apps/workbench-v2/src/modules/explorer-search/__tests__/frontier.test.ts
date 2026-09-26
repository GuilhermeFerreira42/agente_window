// ============================================================================
// frontier.test.ts — TESTE DE FRONTEIRA (FT) do módulo explorer-search.
// 04_10 §2.5 item 4 / 04_15 DoD 4.1: roda em toda sub-fatia (custo ~0 ms).
//
// Trava arquitetural (LEGO):
//   FT-01/05 — NADA fora do módulo importa abaixo do barrel (App.tsx só pode
//              usar ./modules/explorer-search[/index]; hoje nem isso — o wiring
//              só chega na 4.4, então o teste já vira portão permanente).
//   FT-02    — Dentro do módulo: proibido escapar (../.. até src/components,
//              src/domain, src/hooks, src/providers); deps externas só allowlist.
//   FT-03    — contract.ts sem `any` (docs/04: proibido any em porta de serviço).
//   FT-04    — Fábrica REAL do core (4.2): responde; stubs 4.4/4.6/4.7 falham
//              explícito até a sub-fatia de cada um.
//   FT-06    — Constantes congeladas não foram editadas (sanidade).
//   FT-07    — core/** é PURO: só imports relativos, nada de React/DOM/node:.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';

// NOTA: não usar import.meta.url para localizar pastas — sob o environment
// jsdom do Vitest a URL do módulo não é file://. O projeto executa testes
// sempre a partir de platform/apps/workbench-v2 (npm test / npx vitest).
const SRC_ROOT = resolve(process.cwd(), 'src');
// src/modules/explorer-search/
const MODULE_ROOT = join(SRC_ROOT, 'modules', 'explorer-search');

if (!existsSync(MODULE_ROOT)) {
  throw new Error(
    `[frontier.test] Módulo não encontrado em ${MODULE_ROOT}. ` +
      'Execute os testes a partir de platform/apps/workbench-v2.',
  );
}

const MODULE_SEGMENT = 'modules/explorer-search';
const ALLOWED_BARREL_SUFFIXES = new Set(['', '/index']);

/** Deps externas de runtime permitidas ao módulo (UI-only; sem fs, sem shell). */
const ALLOWED_EXTERNAL_DEPS = new Set([
  'react',
  'react-dom',
  '@monaco-editor/react',
  'monaco-editor',
  'lucide-react',
]);

function toPosix(p: string): string {
  return p.split(sep).join('/');
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const SPECIFIER_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

function collectSpecifiers(code: string): string[] {
  const specs: string[] = [];
  for (const re of [SPECIFIER_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) specs.push(m[1]);
  }
  return specs;
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/^\s*\/\/.*$/gm, ''); // full-line comments
}

describe('fronteira LEGO — modules/explorer-search (FT)', () => {
  it('FT-01: nada fora do módulo importa abaixo do barrel', () => {
    const violations: string[] = [];
    const files = walk(SRC_ROOT).filter((f) => !toPosix(f).includes(`${MODULE_SEGMENT}/`));
    for (const file of files) {
      for (const spec of collectSpecifiers(readFileSync(file, 'utf-8'))) {
        const norm = spec.split('\\').join('/');
        const idx = norm.indexOf(MODULE_SEGMENT);
        if (idx === -1) continue;
        const suffix = norm.slice(idx + MODULE_SEGMENT.length) || '';
        if (!ALLOWED_BARREL_SUFFIXES.has(suffix)) {
          violations.push(`${toPosix(file)}  →  "${spec}"`);
        }
      }
    }
    // Exceção controlada (4.3): vite.config.ts pode importar APENAS o barrel
    // do SERVIDOR (./src/modules/explorer-search/server[/index]) para montar o
    // plugin dev — sidecar do barrel principal, nunca abaixo de server/.
    const viteConfig = join(SRC_ROOT, '..', 'vite.config.ts');
    if (existsSync(viteConfig)) {
      for (const spec of collectSpecifiers(readFileSync(viteConfig, 'utf-8'))) {
        const norm = spec.split('\\').join('/');
        const idx = norm.indexOf(MODULE_SEGMENT);
        if (idx === -1) continue;
        const suffix = norm.slice(idx + MODULE_SEGMENT.length) || '';
        const ok = suffix === '/server' || suffix === '/server/index';
        if (!ok) {
          violations.push(`${toPosix(viteConfig)}  →  "${spec}" (fora do módulo só: barrel | /server)`);
        }
      }
    }
    expect(violations, `\nImports proibidos encontrados:\n${violations.join('\n')}\n`).toEqual([]);
  });

  it('FT-02: dentro do módulo, nenhum import escapa para o shell', () => {
    const violations: string[] = [];
    const files = walk(MODULE_ROOT);
    /** Deps externas permitidas em server/** (4.3): node:* nativas + 'ws'
     *  (WebSocket do Single Port, mesma lib do PTY) + 'vite' (só tipos do
     *  plugin). React/UI continua proibido no lado servidor. */
    const ALLOWED_SERVER_DEPS = new Set(['vite', 'ws']);
    for (const file of files) {
      const posix = toPosix(file);
      const isTest = posix.includes('/__tests__/');
      const isServer = posix.includes('/server/');
      for (const spec of collectSpecifiers(readFileSync(file, 'utf-8'))) {
        if (spec.startsWith('.')) {
          const resolved = normalize(resolve(join(file, '..'), spec));
          if (!toPosix(resolved).startsWith(toPosix(normalize(MODULE_ROOT)))) {
            violations.push(`${posix}  →  escapa do módulo: "${spec}"`);
          }
        } else if (!isTest) {
          if (isServer) {
            if (spec.startsWith('node:')) continue;
            const root = spec.startsWith('@')
              ? spec.split('/').slice(0, 2).join('/')
              : spec.split('/')[0];
            if (!ALLOWED_SERVER_DEPS.has(root)) {
              violations.push(`${posix}  →  dep externa fora da allowlist de server/: "${spec}"`);
            }
          } else {
            const root = spec.startsWith('@')
              ? spec.split('/').slice(0, 2).join('/')
              : spec.split('/')[0];
            if (!ALLOWED_EXTERNAL_DEPS.has(root)) {
              violations.push(`${posix}  →  dep externa não permitida: "${spec}"`);
            }
          }
        }
      }
    }
    expect(violations, `\nEscapes de fronteira:\n${violations.join('\n')}\n`).toEqual([]);
  });

  it('FT-03: contract.ts não contém `any` (docs/04)', () => {
    const code = stripComments(readFileSync(join(MODULE_ROOT, 'contract.ts'), 'utf-8'));
    expect(/\bany\b/.test(code), 'contract.ts usa `any` em porta de serviço').toBe(false);
  });

  it('FT-04: fábrica REAL do core (4.2); search real (4.6); stub 4.7 falha explícito', async () => {
    const barrel = await import('../index.js');
    expect(typeof barrel.createExplorerSearchModule).toBe('function');

    const { FakeFsPort } = await import('./fakeFs.js');
    const { asWorkspaceUri } = await import('../core/uri.js');
    const root = asWorkspaceUri('/ft-ws');
    const mod = barrel.createExplorerSearchModule({
      fs: new FakeFsPort(root),
      menus: {
        register: () => () => {},
        execute: async () => {},
        setContext: () => {},
        getContext: () => undefined,
      },
      contextMenu: { open: () => {} },
      workspaceRoot: root,
    });

    // Core vivo: openFolder responde e emite rootChanged (4.2 — sem DOM).
    const roots: string[] = [];
    mod.onEvent((e) => { if (e.type === 'explorer.rootChanged') roots.push(e.uri); });
    await mod.explorer.openFolder({ uri: root });
    expect(roots).toEqual([root]);

    // REAIS desde 4.4: mount + transfer; desde 4.6 c2: search (handle cancelável); stub 4.7 segue falhando explícito (04_15 §3).
    expect(() => mod.mount(document.createElement('div'))).not.toThrow(/4\.4/);
    const handle = mod.search.query({ root, query: { pattern: 'x' } });
    expect(typeof handle.id).toBe('string');
    expect(() => handle.cancel()).not.toThrow();
    expect(() => mod.attach.open({ uri: root, kind: 'code', sessionId: 's' })).toThrow(/4\.7/);
    await expect(mod.explorer.upload({ target: root, entries: [], conflict: 'skip' })).resolves.toBeUndefined();
    await expect(mod.explorer.download({ uris: [] })).resolves.toBeUndefined();
    mod.unmount();
    mod.dispose();
  });

  it('FT-05: App.tsx — se importar o módulo, só pelo barrel (wiring só na 4.4)', () => {
    const appPath = join(SRC_ROOT, 'App.tsx');
    const specs = collectSpecifiers(readFileSync(appPath, 'utf-8')).filter((s) =>
      s.split('\\').join('/').includes(MODULE_SEGMENT),
    );
    for (const spec of specs) {
      const norm = spec.split('\\').join('/');
      const suffix = norm.slice(norm.indexOf(MODULE_SEGMENT) + MODULE_SEGMENT.length) || '';
      expect(ALLOWED_BARREL_SUFFIXES.has(suffix), `App.tsx importa "${spec}" (esperado: só o barrel)`).toBe(true);
    }
  });

  it('FT-06: constantes congeladas não foram alteradas (04_10/04_11)', async () => {
    const c = await import('../core/constants.js');
    expect(c.EXPLORER_VIEW_ID).toBe('workbench.explorer.fileView');
    expect(c.EXPLORER_ITEM_HEIGHT_PX).toBe(22);
    expect(c.ATTACH_SASH_WIDTH_PX).toBe(6);
    expect(c.ATTACH_WIDTH_CSS_VAR).toBe('--attach-width');
    expect(c.ATTACH_MIN_WIDTH_PX).toBe(280);
    expect(c.ATTACH_MAX_WIDTH_PX).toBe(1200);
    expect(c.SEARCH_DEBOUNCE_MS).toBe(250);
    expect(c.SEARCH_DEFAULT_MAX_RESULTS).toBe(2000);
    expect(c.SEARCH_DEFAULT_MAX_FILES).toBe(500);
    expect(c.WATCHER_COALESCE_MS).toBe(300);
    expect([...c.SEARCH_DEFAULT_EXCLUDES]).toContain('node_modules');
    expect([...c.SEARCH_DEFAULT_EXCLUDES]).toContain('.git');
    expect(c.SEARCH_DEFAULT_EXCLUDES).toHaveLength(9);
    expect(c.EXPLORER_CONTEXT_KEYS).toHaveLength(7);
  });

  it('FT-07: core/** é PURO — sem React, sem DOM, sem node:/fs (04_11 §11-A)', () => {
    const coreRoot = join(MODULE_ROOT, 'core');
    const files = walk(coreRoot);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    const bannedGlobals = /\b(document|window|navigator|localStorage|process|require)\b/;
    for (const file of files) {
      const code = stripComments(readFileSync(file, 'utf-8'));
      for (const spec of collectSpecifiers(code)) {
        // No core só existem imports RELATIVOS (./ e ../ dentro do módulo).
        if (!spec.startsWith('.')) {
          violations.push(`${toPosix(file)}  →  dep externa no core: "${spec}"`);
        }
      }
      const global = bannedGlobals.exec(code);
      if (global) {
        violations.push(`${toPosix(file)}  →  global proibido no core: "${global[1]}"`);
      }
    }
    expect(violations, `\nCore impuro:\n${violations.join('\n')}\n`).toEqual([]);
  });
});
