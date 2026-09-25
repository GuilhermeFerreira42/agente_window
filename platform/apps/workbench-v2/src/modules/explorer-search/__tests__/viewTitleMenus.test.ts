// viewTitleMenus.test.ts — ViewTitleContext (régua viva 8080, auditoria_45/c5).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEWS_VISIBILITY, EXPLORER_VIEWS, applyViewVisibility, normalizeViewsVisibility,
  resolveViewTitleContextMenu, resolveViewsToggleMenu,
} from '../core/menus/viewTitleMenus';

describe('viewTitleMenus (04_17/8080: Hide ‖ ☐ Open Editors · ☑ Folders(disabled) · ☑ Outline · ☑ Timeline)', () => {
  it('padrão VS Code: Open Editors oculta; Folders/Outline/Timeline visíveis', () => {
    expect(DEFAULT_VIEWS_VISIBILITY).toEqual({ openEditors: false, folders: true, outline: true, timeline: true });
    expect(EXPLORER_VIEWS.map((v) => v.id)).toEqual(['openEditors', 'folders', 'outline', 'timeline']);
  });
  it('menu do header Outline: Hide habilitado + 4 toggles com checked, Folders desabilitado', () => {
    const m = resolveViewTitleContextMenu('outline', DEFAULT_VIEWS_VISIBILITY);
    expect(m.map((i) => i.label)).toEqual(["Hide 'Outline'", 'Open Editors', 'Folders', 'Outline', 'Timeline']);
    expect(m[0]).toMatchObject({ id: 'explorer.views.hide.outline', enabled: true, group: '1_hide' });
    expect(m[0].checked).toBeUndefined();
    expect(m.slice(1).map((i) => [i.checked, i.enabled])).toEqual([[false, true], [true, false], [true, true], [true, true]]);
    expect(new Set(m.slice(1).map((i) => i.group)).size, 'toggles no mesmo grupo (1 separador após Hide)').toBe(1);
    expect(m.every((i, n) => n === 0 || i.order > m[n - 1].order)).toBe(true);
  });
  it("header da raiz: Hide 'Folders' desabilitado", () => {
    const m = resolveViewTitleContextMenu('folders', DEFAULT_VIEWS_VISIBILITY);
    expect(m[0]).toMatchObject({ label: "Hide 'Folders'", enabled: false });
  });
  it('menu "Views" (…) = só toggles', () => {
    expect(resolveViewsToggleMenu(DEFAULT_VIEWS_VISIBILITY).map((i) => i.label)).toEqual(['Open Editors', 'Folders', 'Outline', 'Timeline']);
  });
  it('applyViewVisibility: Folders nunca some; toggle idempotente devolve o mesmo objeto', () => {
    const v = DEFAULT_VIEWS_VISIBILITY;
    expect(applyViewVisibility(v, 'folders', false)).toBe(v);
    expect(applyViewVisibility(v, 'timeline', true)).toBe(v);
    expect(applyViewVisibility(v, 'timeline', false).timeline).toBe(false);
    expect(applyViewVisibility(v, 'openEditors', true).openEditors).toBe(true);
  });
  it('normalizeViewsVisibility: ignora lixo, força Folders=true, completa ausentes com o padrão', () => {
    expect(normalizeViewsVisibility(null)).toEqual(DEFAULT_VIEWS_VISIBILITY);
    expect(normalizeViewsVisibility({ folders: false, timeline: false, xpto: true, outline: 'sim' }))
      .toEqual({ openEditors: false, folders: true, outline: true, timeline: false });
  });
});
