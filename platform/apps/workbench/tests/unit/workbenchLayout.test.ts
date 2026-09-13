/**
 * Testes focados — Workbench Layout — FATIA-02
 * Valida: toggle, resize, maximize/restore, serialize/hydrate
 * Fonte: 09H_TESTES_DE_IMPLEMENTACAO.md + 07_MATRIZ_DE_VALIDACAO VAL-WB-01,02,03
 */

import { describe, it, expect } from 'vitest';
import { WorkbenchLayoutServiceImpl } from '../../src/logic/workbench/workbenchLayoutService.js';
import { DEFAULT_PART_VISIBILITY, DEFAULT_DIMENSIONS } from '../../src/workbench/layout/types.js';

describe('WorkbenchLayoutServiceImpl - FATIA-02', () => {
  it('deve iniciar com visibilidade e dimensões padrão', () => {
    const svc = new WorkbenchLayoutServiceImpl();
    const vis = svc.getVisibility();
    expect(vis.leftSidebar).toBe(DEFAULT_PART_VISIBILITY.leftSidebar);
    expect(vis.panel).toBe(DEFAULT_PART_VISIBILITY.panel);
    const dims = svc.getDimensions();
    expect(dims.leftSidebar).toBe(DEFAULT_DIMENSIONS.leftSidebar);
  });

  it('togglePart deve alternar visibilidade corretamente (VAL-WB-01)', () => {
    const svc = new WorkbenchLayoutServiceImpl();
    const initial = svc.getVisibility().leftSidebar;
    svc.togglePart({ part: 'leftSidebar' });
    expect(svc.getVisibility().leftSidebar).toBe(!initial);
    svc.togglePart({ part: 'leftSidebar' });
    expect(svc.getVisibility().leftSidebar).toBe(initial);
  });

  it('resizePart deve alterar dimensões sem valores inválidos (VAL-WB-02)', () => {
    const svc = new WorkbenchLayoutServiceImpl();
    svc.resizePart({ part: 'leftSidebar', pixels: 400 });
    expect(svc.getDimensions().leftSidebar).toBe(400);
    // Valores negativos ou NaN devem ser ignorados
    svc.resizePart({ part: 'leftSidebar', pixels: -10 });
    expect(svc.getDimensions().leftSidebar).toBe(400);
    svc.resizePart({ part: 'leftSidebar', pixels: NaN as unknown as number });
    expect(svc.getDimensions().leftSidebar).toBe(400);
  });

  it('maximize e restore devem recompor layout esperado (VAL-WB-03)', () => {
    const svc = new WorkbenchLayoutServiceImpl();
    const before = svc.getDimensions().leftSidebar;
    svc.resizePart({ part: 'leftSidebar', pixels: 350 });
    expect(svc.getDimensions().leftSidebar).toBe(350);

    svc.maximizePanel({ panelId: 'terminal' });
    expect(svc.getMaximizedPanel()).toBe('terminal');

    svc.restorePanel({ panelId: 'terminal' });
    expect(svc.getMaximizedPanel()).toBeNull();
    // Deve restaurar dimensões anteriores
    expect(svc.getDimensions().leftSidebar).toBe(350);
    void before;
  });

  it('serialize e hydrate devem ser determinísticos', () => {
    const svc = new WorkbenchLayoutServiceImpl();
    svc.togglePart({ part: 'panel' });
    svc.resizePart({ part: 'panel', pixels: 500 });
    const snap = svc.serializeInternal();

    const svc2 = new WorkbenchLayoutServiceImpl();
    svc2.hydrate(snap as never);
    expect(svc2.getVisibility().panel).toBe(svc.getVisibility().panel);
    expect(svc2.getDimensions().panel).toBe(500);
  });

  it('hydrate deve suportar formato antigo com visibleParts como array', () => {
    const svc = new WorkbenchLayoutServiceImpl();
    const oldFormat = {
      version: 1,
      visibleParts: ['leftSidebar', 'panel'],
      dimensions: { leftSidebar: 300 },
      activeViews: {},
    };
    svc.hydrate(oldFormat as never);
    expect(svc.getVisibility().leftSidebar).toBe(true);
    expect(svc.getVisibility().panel).toBe(true);
    expect(svc.getVisibility().auxiliaryBar).toBe(false);
  });

  it('onDidChange deve notificar listeners', () => {
    const svc = new WorkbenchLayoutServiceImpl();
    let called = 0;
    const dispose = svc.onDidChange(() => called++);
    svc.togglePart({ part: 'panel' });
    expect(called).toBe(1);
    dispose();
    svc.togglePart({ part: 'panel' });
    expect(called).toBe(1); // não deve chamar após dispose
  });
});
