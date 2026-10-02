// 4.7 c6 — AttachLayoutStore: maximizar/restaurar (puro) + persistência.
import { describe, expect, it } from 'vitest';
import { AttachLayoutStore, ATTACH_STORAGE_KEY } from '../core/attach/attachLayout';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, dump: () => Object.fromEntries(m) }; };

describe('AttachLayoutStore — maximizar (c6)', () => {
  it('toggle emite attach.maximizedChanged, persiste junto da largura e NÃO altera a largura do usuário', () => {
    const st = mem(); const s = new AttachLayoutStore(st); s.setContainerWidth(1000);
    const ev: boolean[] = []; s.onEvent((e) => { if (e.type === 'attach.maximizedChanged') ev.push(e.maximized); });
    s.setWidth(400);
    expect(s.isMaximized()).toBe(false);
    expect(s.toggleMaximized()).toBe(true);
    expect(s.getWidth()).toBe(400);                 // largura do usuário intacta
    expect(s.getMaximizedWidth()).toBe(500);        // teto do clamp: 50 % de 1000 (5.7; era 75 %)
    expect(JSON.parse(st.dump()[ATTACH_STORAGE_KEY])).toEqual({ width: 400, maximized: true });
    s.setMaximized(true);                           // idempotente: sem evento duplicado
    expect(s.toggleMaximized()).toBe(false);
    expect(ev).toEqual([true, false]);
    expect(JSON.parse(st.dump()[ATTACH_STORAGE_KEY])).toEqual({ width: 400, maximized: false });
  });
  it('reload restaura maximizado + largura; teto respeita 1200 px em banda larga', () => {
    const st = mem(); st.setItem(ATTACH_STORAGE_KEY, JSON.stringify({ width: 333, maximized: true }));
    const s = new AttachLayoutStore(st); s.setContainerWidth(1000);
    expect(s.isMaximized()).toBe(true);
    expect(s.getWidth()).toBe(333);
    expect(s.getMaximizedWidth()).toBe(500); // 5.7: teto 50 %
    s.setContainerWidth(3000);
    expect(s.getMaximizedWidth()).toBe(1200);       // teto absoluto
    // resetWidth com maximizado mantém a flag persistida
    s.resetWidth();
    expect(JSON.parse(st.dump()[ATTACH_STORAGE_KEY])).toEqual({ width: null, maximized: true });
  });
});
