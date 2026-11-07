// ============================================================================
// __tests__/centerSaveRouting.test.tsx — Fatia 15, Onda 2b (D146 §2, passo 2b).
//
// Prova a FIAÇÃO DA FÁBRICA (index.ts), não o visual: com duas superfícies de
// editor montadas ao mesmo tempo — o anexo da coluna e o corpo da aba central —
// salvar, recarregar e detectar mudança externa têm de ir para o painel que TEM
// a uri. Cada CodeEditorPane só conhece os modelos do Monaco que ele mesmo
// criou; antes desta onda havia UM holder só, e com o centro montado o
// attach.save de um arquivo do centro lançaria "não está aberto no anexo" — ou
// seja, a RF15-1 morreria exatamente no caso que a fusão cria.
//
// Fronteira do teste, declarada para ninguém ler além do que foi provado:
//   • AttachArea e CodeEditorPane são SUBSTITUÍDOS por dublês que só registram a
//     api do painel (é essa api que a fábrica consulta). Nada aqui prova o
//     Monaco real; prova que a fábrica pergunta ao painel certo.
//   • O EditorService, o GitService, o AttachLayoutStore, o watcher de fs.changed
//     e o attachSave/attachReload são os REAIS, construídos pela fábrica real.
//   • O Monaco falso devolve getModel() === null de propósito: é o que faz o
//     outlineTracker (5.6) retornar antes de importar o monaco-editor de verdade,
//     que neste ambiente custaria memória demais para um teste unitário.
// ============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import { createExplorerSearchModule } from '../index';
import { asWorkspaceUri } from '../core/uri';
import { FakeFsPort } from './fakeFs';
import type { WorkspaceUri } from '../contract';

// ---- dublês dos painéis: registram a api que a fábrica vai consultar --------
const h = vi.hoisted(() => {
  type Api = {
    has(uri: string): boolean;
    getContent(uri: string): string | null;
    markSaved(uri: string): void;
    reload(uri: string, content: string): void;
    discard(uri: string): void;
  };
  type Painel = {
    onde: 'anexo' | 'centro';
    conteudos: Map<string, string>;
    marcadosSalvos: string[];
    recarregados: Array<{ uri: string; content: string }>;
    api: Api;
  };
  const registro: Painel[] = [];
  const criar = (onde: 'anexo' | 'centro'): Painel => {
    const painel: Painel = {
      onde,
      conteudos: new Map<string, string>(),
      marcadosSalvos: [],
      recarregados: [],
      api: {
        has: (uri) => painel.conteudos.has(uri),
        getContent: (uri) => painel.conteudos.get(uri) ?? null,
        markSaved: (uri) => { painel.marcadosSalvos.push(uri); },
        reload: (uri, content) => { painel.recarregados.push({ uri, content }); },
        discard: (uri) => { painel.conteudos.delete(uri); },
      },
    };
    registro.push(painel);
    return painel;
  };
  // getModel() === null faz o outlineTracker.compute() sair antes de loadRegistry()
  // — que importaria o monaco-editor de verdade dentro do teste.
  const criarMonacoFalso = () => ({
    getModel: () => null,
    onDidChangeModel: () => ({ dispose() {} }),
    onDidChangeModelContent: () => ({ dispose() {} }),
    revealLineInCenter: () => {},
    setPosition: () => {},
    focus: () => {},
  });
  return { registro, criar, criarMonacoFalso };
});

type PropsFalsas = {
  sessionId?: string;
  onEditorReady?: (ed: unknown, api: unknown) => void;
};

vi.mock('../ui/attach/CodeEditorPane', async () => {
  const { createElement, useEffect } = await import('react');
  return {
    // D152 §2: ver comentário em centerCodeEditor.test.tsx — o DiffPane, importado
    // pelo CenterCodeEditor, consome ATTACH_MONACO_OPTIONS deste módulo.
    ATTACH_MONACO_OPTIONS: { fontSize: 13, lineHeight: 18 },
    CodeEditorPane: (props: PropsFalsas) => {
      useEffect(() => { props.onEditorReady?.(h.criarMonacoFalso(), h.criar('centro').api); }, []);
      return createElement('div', { 'data-testid': 'painel-falso-centro', 'data-sessao': props.sessionId });
    },
  };
});

vi.mock('../ui/attach/AttachArea', async () => {
  const { createElement, useEffect } = await import('react');
  return {
    AttachArea: (props: PropsFalsas) => {
      useEffect(() => { props.onEditorReady?.(h.criarMonacoFalso(), h.criar('anexo').api); }, []);
      return createElement('div', { 'data-testid': 'anexo-falso', 'data-sessao': props.sessionId });
    },
  };
});

// ---- fs falso que GRAVA (o FakeFsPort de 4.2 lança em writeFile de propósito) --
class FsQueGrava extends FakeFsPort {
  gravacoes: Array<{ uri: WorkspaceUri; content: string; atomic: true }> = [];
  private ouvintes: Array<(e: { type: 'fs.changed'; changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }> }) => void> = [];
  // Parâmetro OPCIONAL de propósito: o FakeFsPort de 4.2 declara writeFile() sem
  // parâmetro (lança, porque os testes do core nunca gravam) e o FileSystemPortLike
  // declara com. Uma assinatura com parâmetro opcional satisfaz as duas; com
  // parâmetro obrigatório o TS recusa a sobrescrita (TS2416).
  async writeFile(input?: { uri: WorkspaceUri; content: string; atomic: true }): Promise<void> {
    if (!input) throw new Error('[teste] writeFile sem input');
    this.gravacoes.push(input);
  }
  // Sobrescreve o onEvent do FakeFsPort para o teste poder disparar mudança
  // externa com o conteúdo que quiser, sem depender de createFile/remove.
  onEvent(cb: (e: { type: 'fs.changed'; changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }> }) => void): () => void {
    this.ouvintes.push(cb);
    return () => { this.ouvintes = this.ouvintes.filter((c) => c !== cb); };
  }
  disparar(changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }>): void {
    for (const cb of this.ouvintes) cb({ type: 'fs.changed', changes });
  }
}

const S = 's1';
const OUTRA = 's2';
const RAIZ = asWorkspaceUri('/ws');
const URI_CENTRO = asWorkspaceUri('/ws/centro.ts');
const URI_ANEXO = asWorkspaceUri('/ws/anexo.ts');
const CONTEUDO_CENTRO = 'export const centro = 1;';
const CONTEUDO_ANEXO = 'export const anexo = 2;';

/** Último painel registrado daquele tipo — remontagens criam entradas novas. */
function painel(onde: 'anexo' | 'centro') {
  const achados = h.registro.filter((p) => p.onde === onde);
  if (!achados.length) throw new Error(`nenhum painel ${onde} foi montado`);
  return achados[achados.length - 1];
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => { cleanup(); document.body.innerHTML = ''; h.registro.length = 0; });

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}
const assentar = async (): Promise<void> => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

/** Módulo real + as duas superfícies montadas + uma uri em cada painel. */
async function montarTudo(opts: { comAnexo?: boolean; comCentro?: boolean } = {}) {
  const fs = new FsQueGrava(RAIZ);
  fs.seed([
    { path: '/ws', kind: 'directory' },
    { path: '/ws/centro.ts', kind: 'file' },
    { path: '/ws/anexo.ts', kind: 'file' },
  ]);
  const mod = createExplorerSearchModule({
    fs,
    menus: { register: () => () => {}, execute: async () => {}, setContext: () => {}, getContext: () => undefined },
    contextMenu: { open: () => {} },
    workspaceRoot: RAIZ,
  });
  const hostAnexo = host();
  const hostCentro = host();
  if (opts.comAnexo !== false) await act(async () => { mod.mountAttach(hostAnexo, { sessionId: S }); });
  if (opts.comCentro !== false) await act(async () => { mod.mountCodeEditor?.(hostCentro, { sessionId: S }); });
  await assentar();
  await act(async () => { await mod.attach.open({ uri: URI_ANEXO, kind: 'code', sessionId: S, pinned: true }); });
  await act(async () => { await mod.attach.open({ uri: URI_CENTRO, kind: 'code', sessionId: S, pinned: true }); });
  if (opts.comAnexo !== false) painel('anexo').conteudos.set(URI_ANEXO, CONTEUDO_ANEXO);
  if (opts.comCentro !== false) painel('centro').conteudos.set(URI_CENTRO, CONTEUDO_CENTRO);
  return { mod, fs, hostAnexo, hostCentro };
}

describe('Onda 2b — a fábrica roteia salvar/recarregar para o painel que tem a uri', () => {
  it('limpeza adiada do corpo anterior não retira o fechamento da nova montagem da mesma sessão', async () => {
    const { mod } = await montarTudo({ comAnexo: false });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      // Reproduz fechar a última aba e reabri-la antes do unmount adiado.
      await act(async () => {
        mod.unmountCodeEditor?.();
        mod.mountCodeEditor?.(host(), { sessionId: S });
      });
      await act(async () => { vi.runOnlyPendingTimers(); });
      act(() => { mod.attach.requestCloseTab?.({ sessionId: S, uri: URI_CENTRO }); });
      expect(mod.attach.getTabs({ sessionId: S }).some((tab) => tab.uri === URI_CENTRO)).toBe(false);
      expect(document.querySelector('[data-testid="center-save-dialog"]')).toBeNull();
    } finally {
      await act(async () => { mod.dispose(); vi.runOnlyPendingTimers(); });
      vi.useRealTimers();
    }
  });

  it('mountCodeEditor existe no contrato e monta o corpo central sem criar caixa de layout no host', async () => {
    const { mod, hostCentro } = await montarTudo({ comAnexo: false });
    expect(typeof mod.mountCodeEditor).toBe('function');
    expect(typeof mod.unmountCodeEditor).toBe('function');
    const corpo = hostCentro.querySelector('[data-testid="center-code-editor"]');
    expect(corpo).not.toBeNull();
    // display:contents é o que mountAttach já faz: o contêiner intermediário não
    // pode virar uma caixa flexível dentro do chassi (Regra 6).
    const intermediario = hostCentro.firstElementChild as HTMLElement;
    expect(intermediario.style.display).toBe('contents');
    expect(intermediario.contains(corpo)).toBe(true);
  });

  it('SÓ o centro montado: salvar o arquivo do centro GRAVA (antes lançaria "não está aberto no anexo")', async () => {
    const { mod, fs } = await montarTudo({ comAnexo: false });
    await act(async () => { await mod.attach.save({ uri: URI_CENTRO }); });
    expect(fs.gravacoes).toEqual([{ uri: URI_CENTRO, content: CONTEUDO_CENTRO, atomic: true }]);
    expect(painel('centro').marcadosSalvos).toEqual([URI_CENTRO]);
  });

  it('as DUAS superfícies montadas: cada save vai para o painel que tem a uri', async () => {
    const { mod, fs } = await montarTudo();
    await act(async () => { await mod.attach.save({ uri: URI_CENTRO }); });
    await act(async () => { await mod.attach.save({ uri: URI_ANEXO }); });
    expect(fs.gravacoes).toEqual([
      { uri: URI_CENTRO, content: CONTEUDO_CENTRO, atomic: true },
      { uri: URI_ANEXO, content: CONTEUDO_ANEXO, atomic: true },
    ]);
    // markSaved não pode vazar para o outro painel: é ele que limpa o dirty do
    // modelo certo no Monaco.
    expect(painel('centro').marcadosSalvos).toEqual([URI_CENTRO]);
    expect(painel('anexo').marcadosSalvos).toEqual([URI_ANEXO]);
  });

  it('o anexo continua funcionando igual com o centro montado (nada regressiu na superfície antiga)', async () => {
    const { mod, fs } = await montarTudo();
    await act(async () => { await mod.attach.save({ uri: URI_ANEXO }); });
    expect(fs.gravacoes).toEqual([{ uri: URI_ANEXO, content: CONTEUDO_ANEXO, atomic: true }]);
    expect(mod.attach.getTabs({ sessionId: S }).map((t) => t.uri)).toEqual([URI_ANEXO, URI_CENTRO]);
  });

  it('uri que NENHUM painel tem rejeita com a mensagem que o FT-04 trava', async () => {
    const { mod, fs } = await montarTudo();
    await expect(mod.attach.save({ uri: asWorkspaceUri('/ws/desconhecido.ts') }))
      .rejects.toThrow(/não está aberto no anexo/);
    expect(fs.gravacoes).toEqual([]);
  });

  it('mudança externa recarrega no painel que tem a uri, e só nele', async () => {
    const { fs } = await montarTudo();
    fs.disparar([{ uri: URI_CENTRO, kind: 'changed' }]);
    await assentar();
    expect(painel('centro').recarregados).toEqual([{ uri: URI_CENTRO, content: '<conteúdo fake de centro.ts>' }]);
    expect(painel('anexo').recarregados).toEqual([]);
  });

  it('attach.requestCloseTab encaminha ao CENTRO e fecha a aba limpa sem diálogo', async () => {
    const { mod } = await montarTudo({ comAnexo: false });
    expect(typeof mod.attach.requestCloseTab).toBe('function');
    await act(async () => { mod.attach.requestCloseTab?.({ sessionId: S, uri: URI_CENTRO }); });
    const dialogo = document.querySelector('[data-testid="center-save-dialog"]');
    expect(dialogo).toBeNull();
    expect(mod.attach.getTabs({ sessionId: S }).map((t) => t.uri)).toEqual([URI_ANEXO]);
  });

  it('requestCloseTab de sessão sem corpo central não lança e não abre diálogo', async () => {
    const { mod } = await montarTudo({ comAnexo: false });
    await act(async () => { mod.attach.requestCloseTab?.({ sessionId: OUTRA, uri: URI_CENTRO }); });
    expect(document.querySelector('[data-testid="center-save-dialog"]')).toBeNull();
    expect(mod.attach.getTabs({ sessionId: S }).map((t) => t.uri)).toContain(URI_CENTRO);
  });

  it('unmountCodeEditor retira o painel: save volta a rejeitar e requestCloseTab vira no-op', async () => {
    const { mod, hostCentro } = await montarTudo({ comAnexo: false });
    await act(async () => { mod.unmountCodeEditor?.(); });
    await assentar();
    expect(hostCentro.querySelector('[data-testid="center-code-editor"]')).toBeNull();
    await expect(mod.attach.save({ uri: URI_CENTRO })).rejects.toThrow(/não está aberto/);
    await act(async () => { mod.attach.requestCloseTab?.({ sessionId: S, uri: URI_CENTRO }); });
    expect(document.querySelector('[data-testid="center-save-dialog"]')).toBeNull();
  });

  it('montar duas vezes no MESMO host não duplica o corpo; trocar a sessão re-renderiza', async () => {
    const { mod, hostCentro } = await montarTudo({ comAnexo: false });
    await act(async () => { mod.mountCodeEditor?.(hostCentro, { sessionId: S }); });
    expect(hostCentro.querySelectorAll('[data-testid="center-code-editor"]')).toHaveLength(1);
    await act(async () => { mod.mountCodeEditor?.(hostCentro, { sessionId: OUTRA }); });
    await assentar();
    expect(hostCentro.querySelectorAll('[data-testid="center-code-editor"]')).toHaveLength(1);
    expect(hostCentro.querySelector('[data-testid="painel-falso-centro"]')?.getAttribute('data-sessao')).toBe(OUTRA);
  });

  it('dispose() desmonta o centro junto com o resto (nenhum host fica com filho)', async () => {
    const { mod, hostAnexo, hostCentro } = await montarTudo();
    await act(async () => { mod.dispose(); });
    await assentar();
    expect(hostCentro.childElementCount).toBe(0);
    expect(hostAnexo.childElementCount).toBe(0);
  });
});
