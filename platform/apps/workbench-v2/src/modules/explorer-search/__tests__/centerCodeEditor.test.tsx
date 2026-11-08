// ============================================================================
// __tests__/centerCodeEditor.test.tsx — Fatia 15, Onda 2b (D146 §2, passo 2b).
//
// O que está sendo provado: o CORPO da aba central é capaz de salvar (RF15-1) e
// é o mesmo CodeEditorPane do anexo reaproveitado, sem faixa de abas, sem
// cabeçalho, sem sash e sem empty state — que no centro pertencem ao shell.
//
// Fronteira do teste: o CodeEditorPane é SUBSTITUÍDO por um painel falso. O que
// isto prova é a FIAÇÃO (Ctrl+S → onSave, falha → mensagem, mudança externa →
// diálogo, pedido de fechar vindo de fora → diálogo que salva ou descarta). O
// que isto NÃO prova é o Monaco de verdade gravando no disco — isso é o
// CodeEditorPane, que tem cobertura própria e não foi tocado neste passo, e de
// ponta a ponta só se prova com o servidor de pé (ver "NÃO VERIFICADO" no
// painel). O EditorService, ao contrário, é o REAL: as abas, o dirty e os
// eventos saem dele, não de um dublê.
//
// O AttachDialog usa createPortal, então os diálogos aparecem em document.body
// e não dentro do container renderizado — as buscas abaixo são no document.
// ============================================================================
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { EditorService, GRUPO_SECUNDARIO } from '../core/editor/editorService';
import { asWorkspaceUri } from '../core/uri';
import { ATTACH_STRINGS } from '../ui/attach/attachStrings';
import { CenterCodeEditor, type CenterCloseRequester } from '../ui/center/CenterCodeEditor';
import type { WorkspaceUri } from '../contract';

// ---- painel falso: guarda as props do último render para o teste disparar ----
const h = vi.hoisted(() => ({
  props: null as null | {
    onSaveRequest?: (uri: WorkspaceUri) => void;
    saveError?: string | null;
    sessionId?: string;
  },
}));

vi.mock('../ui/attach/CodeEditorPane', () => ({
  // D152 §2: o CenterCodeEditor passou a importar o DiffPane, e o DiffPane lê
  // ATTACH_MONACO_OPTIONS deste módulo (DiffPane.tsx:24). O mock de um módulo
  // PARCIAL tem de devolver o que os vizinhos consomem, senão o teste morre no
  // import e deixa de medir o que prometia medir.
  ATTACH_MONACO_OPTIONS: { fontSize: 13, lineHeight: 18 },
  CodeEditorPane: (props: { onSaveRequest?: (uri: WorkspaceUri) => void; saveError?: string | null; sessionId?: string }) => {
    h.props = props;
    return (
      <div data-testid="painel-falso" data-sessao={props.sessionId}>
        <button type="button" data-testid="disparar-ctrl-s" onClick={() => props.onSaveRequest?.(URI)}>Ctrl+S</button>
        {props.saveError ? <div data-testid="erro-de-save">{props.saveError}</div> : null}
      </div>
    );
  },
}));

const SESSAO = 's1';
const OUTRA_SESSAO = 's2';
const URI = asWorkspaceUri('/ws/centro.ts');
const NOME = 'centro.ts';

const fsFalso = {
  readFile: async () => ({ content: '', encoding: 'utf-8' as const }),
  readFileBinary: async () => ({ dataBase64: '', mime: 'text/plain' }),
};

afterEach(() => { cleanup(); h.props = null; });

function montar(opts: { onSave?: (uri: WorkspaceUri) => Promise<void>; comOnSave?: boolean; sessionId?: string } = {}) {
  const editor = new EditorService();
  const sessao = opts.sessionId ?? SESSAO;
  // pinned: uma aba em preview é SUBSTITUÍDA pela próxima abertura (editorService
  // fecha a anterior), o que falsearia os testes que abrem uma segunda uri.
  editor.open({ sessionId: sessao, uri: URI, kind: 'code', pinned: true });
  const onSave = opts.onSave ?? vi.fn(async (uri: WorkspaceUri) => { editor.markSaved({ sessionId: sessao, uri }); });
  const onReload = vi.fn(async () => {});
  const pedidos: Array<CenterCloseRequester | null> = [];
  const utils = render(
    <CenterCodeEditor
      editor={editor}
      sessionId={sessao}
      fs={fsFalso}
      {...(opts.comOnSave === false ? {} : { onSave })}
      onReload={onReload}
      onCloseRequester={(r) => { pedidos.push(r); }}
    />,
  );
  return { editor, sessao, onSave, onReload, pedidos, ...utils };
}

const dialogo = (testId: string): HTMLElement | null => document.querySelector(`[data-testid="${testId}"]`);
const botao = (testId: string, id: string): HTMLElement => {
  const b = dialogo(testId)?.querySelector<HTMLElement>(`[data-button-id="${id}"]`);
  if (!b) throw new Error(`botão ${id} ausente do diálogo ${testId}`);
  return b;
};
const rotulos = (testId: string): string[] =>
  Array.from(dialogo(testId)?.querySelectorAll('[data-button-id]') ?? []).map((b) => b.textContent ?? '');
/** Espera as promises do doSave/then assentarem dentro de act. */
const assentar = async (): Promise<void> => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

describe('CenterCodeEditor — o corpo da aba central (Onda 2b)', () => {
  it('reaproveita o escopo de estilo do anexo: .attach-viewlet + .editor-container', () => {
    const { container } = montar();
    const raiz = container.querySelector('[data-testid="center-code-editor"]');
    expect(raiz?.classList.contains('attach-viewlet')).toBe(true);
    expect(raiz?.classList.contains('center-code-editor')).toBe(true);
    // Sem essas classes as 75 regras escopadas do attach.css não alcançam o
    // editor: ele funcionaria e apareceria sem estilo nenhum.
    expect(raiz?.querySelector('.editor-container')).not.toBeNull();
    expect(raiz?.querySelector('[data-testid="painel-falso"]')).not.toBeNull();
  });

  it('não traz faixa de abas, cabeçalho, sash nem empty state — isso é do shell no centro', () => {
    const { container } = montar();
    expect(container.querySelector('.title.tabs')).toBeNull();
    expect(container.querySelector('.tabs-container')).toBeNull();
    expect(container.querySelector('.explorer-attach-sash')).toBeNull();
    expect(container.querySelector('[role="separator"]')).toBeNull();
    // D169 — esta asserção MUDOU DE SENTIDO, e o motivo está registrado:
    // a regra da Onda 2b era "no centro, o cabeçalho é do shell". Breadcrumb não
    // é cabeçalho nem faixa de abas: é a faixa de navegação do ARQUIVO, que o dono
    // pediu explicitamente no editor definitivo (ajuste complementar de
    // 2026-11-06). O que continua proibido aqui é o que era o objeto da regra:
    // faixa de abas, aba vazia e sash — as três seguem testadas acima.
    // A presença do breadcrumb passou a ser EXIGIDA, com caminho, no teste novo
    // abaixo: trocar "proibido" por "esquecido" seria pior que não testar.
    expect(container.querySelector('.tabs-container')).toBeNull();
    expect(container.querySelector('.title.tabs')).toBeNull();
  });

  it('D169: mostra breadcrumb com o caminho do arquivo quando há aba de código', () => {
    const { container } = montar();
    const bc = container.querySelector('[data-testid="center-breadcrumbs"]');
    expect(bc).not.toBeNull();
    // caminho relativo à raiz: a barra tem de mostrar a pasta e o nome do arquivo
    expect(bc?.textContent).toContain('centro.ts');
  });

  it('RF15-1: Ctrl+S dentro do editor pede o salvamento da uri', () => {
    const { onSave } = montar();
    fireEvent.click(document.querySelector('[data-testid="disparar-ctrl-s"]')!);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(URI);
  });

  it('falha de save vira mensagem visível na uri ativa, com o nome do arquivo e o motivo', async () => {
    const { onSave } = montar({ onSave: vi.fn(async () => { throw new Error('disco cheio'); }) });
    fireEvent.click(document.querySelector('[data-testid="disparar-ctrl-s"]')!);
    await assentar();
    expect(document.querySelector('[data-testid="erro-de-save"]')?.textContent)
      .toBe(ATTACH_STRINGS.saveFailed(NOME, 'disco cheio'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('a mensagem de falha some depois de um salvamento que resolve', async () => {
    let falhar = true;
    const onSave = vi.fn(async () => { if (falhar) throw new Error('disco cheio'); });
    montar({ onSave });
    fireEvent.click(document.querySelector('[data-testid="disparar-ctrl-s"]')!);
    await assentar();
    expect(document.querySelector('[data-testid="erro-de-save"]')).not.toBeNull();
    falhar = false;
    fireEvent.click(document.querySelector('[data-testid="disparar-ctrl-s"]')!);
    await assentar();
    expect(document.querySelector('[data-testid="erro-de-save"]')).toBeNull();
  });

  it('nova edição na uri limpa a mensagem de falha (dirtyChanged)', async () => {
    const { editor, onSave } = montar({ onSave: vi.fn(async () => { throw new Error('disco cheio'); }) });
    fireEvent.click(document.querySelector('[data-testid="disparar-ctrl-s"]')!);
    await assentar();
    expect(document.querySelector('[data-testid="erro-de-save"]')).not.toBeNull();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    expect(document.querySelector('[data-testid="erro-de-save"]')).toBeNull();
  });

  it('mudança externa com a aba SUJA abre o diálogo Recarregar / Manter Alterações', async () => {
    const { editor } = montar();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { editor.notifyExternalChange(URI); });
    const d = dialogo('center-conflict-dialog');
    expect(d).not.toBeNull();
    expect(d?.querySelector('.dialog-message')?.textContent).toBe(ATTACH_STRINGS.conflictTitle(NOME));
    expect(rotulos('center-conflict-dialog')).toEqual([ATTACH_STRINGS.reload, ATTACH_STRINGS.keep]);
  });

  it('Recarregar chama onReload com a uri e fecha o diálogo', async () => {
    const { editor, onReload } = montar();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { editor.notifyExternalChange(URI); });
    fireEvent.click(botao('center-conflict-dialog', 'reload'));
    await assentar();
    expect(onReload).toHaveBeenCalledWith(URI);
    expect(dialogo('center-conflict-dialog')).toBeNull();
  });

  it('Manter Alterações fecha o diálogo SEM recarregar — o que o usuário editou fica', async () => {
    const { editor, onReload } = montar();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { editor.notifyExternalChange(URI); });
    fireEvent.click(botao('center-conflict-dialog', 'keep'));
    await assentar();
    expect(onReload).not.toHaveBeenCalled();
    expect(dialogo('center-conflict-dialog')).toBeNull();
  });

  it('mudança externa com a aba LIMPA não abre diálogo (recarga silenciosa é do módulo)', () => {
    const { editor } = montar();
    act(() => { editor.notifyExternalChange(URI); });
    expect(dialogo('center-conflict-dialog')).toBeNull();
  });

  it('evento de OUTRA sessão não abre diálogo nem erro neste corpo', () => {
    const { editor } = montar();
    act(() => {
      editor.open({ sessionId: OUTRA_SESSAO, uri: URI, kind: 'code', pinned: true });
      editor.setDirty({ sessionId: OUTRA_SESSAO, uri: URI, dirty: true });
    });
    expect(dialogo('center-conflict-dialog')).toBeNull();
    expect(dialogo('center-save-dialog')).toBeNull();
  });

  it('o corpo registra com o factory quem atende pedido de fechar aba, e retira no unmount', () => {
    const { pedidos, unmount } = montar();
    expect(pedidos).toHaveLength(1);
    expect(typeof pedidos[0]).toBe('function');
    unmount();
    expect(pedidos[pedidos.length - 1]).toBeNull();
  });

  it('pedido de fechar vindo de FORA abre Salvar / Não Salvar / Cancelar', () => {
    const { pedidos, editor } = montar();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { (pedidos[0] as CenterCloseRequester)({ sessionId: SESSAO, uri: URI }); });
    const d = dialogo('center-save-dialog');
    expect(d).not.toBeNull();
    expect(d?.querySelector('.dialog-message')?.textContent).toBe(ATTACH_STRINGS.saveTitle(NOME));
    expect(rotulos('center-save-dialog')).toEqual([ATTACH_STRINGS.save, ATTACH_STRINGS.dontSave, ATTACH_STRINGS.cancel]);
  });

  it('pedido de fechar arquivo limpo fecha imediatamente, sem diálogo nem escrita', () => {
    const { pedidos, editor, onSave } = montar();
    act(() => { (pedidos[0] as CenterCloseRequester)({ sessionId: SESSAO, uri: URI }); });
    expect(editor.getTabs(SESSAO)).toEqual([]);
    expect(dialogo('center-save-dialog')).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('fechar split com dois arquivos sujos pede decisão para cada um e Cancelar preserva o restante', async () => {
    const editor = new EditorService();
    const group = GRUPO_SECUNDARIO(SESSAO);
    const other = asWorkspaceUri('/ws/segundo.ts');
    editor.open({ sessionId: SESSAO, uri: asWorkspaceUri('/ws/principal.ts'), kind: 'code', pinned: true });
    editor.split(SESSAO);
    for (const uri of [URI, other]) {
      editor.open({ sessionId: group, uri, kind: 'code', pinned: true });
      editor.setDirty({ sessionId: group, uri, dirty: true });
    }
    const onSave = vi.fn(async (uri: WorkspaceUri) => { editor.markSaved({ sessionId: group, uri }); });
    render(<CenterCodeEditor editor={editor} sessionId={SESSAO} fs={fsFalso} onSave={onSave}
      splitCapabilities={{ isSplit: () => editor.isSplit(SESSAO),
        unsplit: (force) => editor.unsplit({ sessionId: SESSAO, force }),
        setFocusSide: () => {}, focusSideOf: () => 'secundario' }} />);
    fireEvent.click(document.querySelector('[aria-label="Fechar editor dividido"]')!);
    fireEvent.click(botao('center-save-dialog', 'save'));
    await assentar();
    expect(editor.isSplit(SESSAO)).toBe(true);
    expect(dialogo('center-save-dialog')?.textContent).toContain('segundo.ts');
    fireEvent.click(botao('center-save-dialog', 'cancel'));
    expect(editor.getTabs(group)).toHaveLength(2);
    expect(editor.getTabs(group).find((t) => t.uri === other)?.dirty).toBe(true);
    expect(onSave).toHaveBeenCalledWith(URI);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('Não Salvar descarta: a aba sai do modelo mesmo estando suja', async () => {
    const { pedidos, editor, onSave } = montar();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { (pedidos[0] as CenterCloseRequester)({ sessionId: SESSAO, uri: URI }); });
    fireEvent.click(botao('center-save-dialog', 'dontSave'));
    await assentar();
    expect(onSave).not.toHaveBeenCalled();
    expect(editor.getTabs(SESSAO).map((t) => t.uri)).toEqual([]);
    expect(dialogo('center-save-dialog')).toBeNull();
  });

  it('Salvar com sucesso grava E só então fecha a aba', async () => {
    const { pedidos, editor, onSave } = montar();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { (pedidos[0] as CenterCloseRequester)({ sessionId: SESSAO, uri: URI }); });
    fireEvent.click(botao('center-save-dialog', 'save'));
    await assentar();
    expect(onSave).toHaveBeenCalledWith(URI);
    expect(editor.getTabs(SESSAO).map((t) => t.uri)).toEqual([]);
  });

  it('Salvar com FALHA mantém a aba aberta e suja — nada de descarte silencioso', async () => {
    const { pedidos, editor } = montar({ onSave: vi.fn(async () => { throw new Error('disco cheio'); }) });
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { (pedidos[0] as CenterCloseRequester)({ sessionId: SESSAO, uri: URI }); });
    fireEvent.click(botao('center-save-dialog', 'save'));
    await assentar();
    expect(editor.getTabs(SESSAO).map((t) => t.uri)).toEqual([URI]);
    expect(editor.getTabs(SESSAO)[0].dirty).toBe(true);
    expect(document.querySelector('[data-testid="erro-de-save"]')?.textContent)
      .toBe(ATTACH_STRINGS.saveFailed(NOME, 'disco cheio'));
  });

  it('Cancelar fecha o diálogo sem salvar e sem descartar', async () => {
    const { pedidos, editor, onSave } = montar();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { (pedidos[0] as CenterCloseRequester)({ sessionId: SESSAO, uri: URI }); });
    fireEvent.click(botao('center-save-dialog', 'cancel'));
    await assentar();
    expect(onSave).not.toHaveBeenCalled();
    expect(editor.getTabs(SESSAO).map((t) => t.uri)).toEqual([URI]);
    expect(dialogo('center-save-dialog')).toBeNull();
  });

  it('fechar a aba por fora limpa o diálogo que estava aberto para ela', () => {
    const { pedidos, editor } = montar();
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    act(() => { (pedidos[0] as CenterCloseRequester)({ sessionId: SESSAO, uri: URI }); });
    expect(dialogo('center-save-dialog')).not.toBeNull();
    act(() => { editor.close({ sessionId: SESSAO, uri: URI, force: true }); });
    expect(dialogo('center-save-dialog')).toBeNull();
  });

  it('sem onSave o corpo não finge que salvou: não grava, não mostra erro, não fecha', async () => {
    const { pedidos, editor } = montar({ comOnSave: false });
    act(() => { editor.setDirty({ sessionId: SESSAO, uri: URI, dirty: true }); });
    fireEvent.click(document.querySelector('[data-testid="disparar-ctrl-s"]')!);
    await assentar();
    expect(document.querySelector('[data-testid="erro-de-save"]')).toBeNull();
    act(() => { (pedidos[0] as CenterCloseRequester)({ sessionId: SESSAO, uri: URI }); });
    fireEvent.click(botao('center-save-dialog', 'save'));
    await assentar();
    expect(editor.getTabs(SESSAO).map((t) => t.uri)).toEqual([URI]);
  });

  it('a mensagem de erro de save só aparece para a URI ATIVA', async () => {
    const { editor } = montar({ onSave: vi.fn(async () => { throw new Error('disco cheio'); }) });
    const outra = asWorkspaceUri('/ws/outra.ts');
    act(() => { editor.open({ sessionId: SESSAO, uri: outra, kind: 'code', pinned: true }); });
    // salva a outra uri (que agora é a ativa) e volta para a primeira
    h.props?.onSaveRequest?.(outra);
    await assentar();
    expect(document.querySelector('[data-testid="erro-de-save"]')?.textContent)
      .toBe(ATTACH_STRINGS.saveFailed('outra.ts', 'disco cheio'));
    act(() => { editor.activate({ sessionId: SESSAO, uri: URI }); });
    expect(document.querySelector('[data-testid="erro-de-save"]')).toBeNull();
  });
});
