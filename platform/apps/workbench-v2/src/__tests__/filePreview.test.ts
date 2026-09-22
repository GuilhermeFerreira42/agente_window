// ============================================================================
// filePreview.test.ts — BLOCO 4.4-fix: utilidades puras do fluxo arquivo/Editor
// (BUG-P1 Image Preview + BUG-V1 clamp do menu "…" do EXPLORER).
// Puros, sem DOM: estes são os testes focados exigidos pelo bloco.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { clampMenuPosition, isImageFile, languageForPath } from '../domain/filePreview';

describe('isImageFile (Image Preview do aceite BUG-P1)', () => {
  it('png/jpg/jpeg/gif/bmp/webp/svg/ico/avif são imagem (case-insensitive)', () => {
    for (const name of ['foto.png', 'foto.PNG', 'a.jpg', 'a.JPEG', 'gif.gif', 'b.bmp', 'w.webp', 'icon.SVG', 'i.ico', 'v.avif']) {
      expect(isImageFile(name), name).toBe(true);
    }
  });
  it('texto/código/sem extensão NÃO são imagem', () => {
    for (const name of ['a.txt', 'b.ts', 'c.json', 'README', 'd.png.bak', '.png']) {
      expect(isImageFile(name), name).toBe(false);
    }
  });
});

describe('languageForPath', () => {
  it('mapeia extensões conhecidas', () => {
    expect(languageForPath('a/b.json')).toBe('json');
    expect(languageForPath('x.css')).toBe('css');
    expect(languageForPath('doc.md')).toBe('markdown');
    expect(languageForPath('app.tsx')).toBe('typescript');
    expect(languageForPath('script.mjs')).toBe('javascript');
    expect(languageForPath('tool.py')).toBe('python');
    expect(languageForPath('ci.yaml')).toBe('yaml');
    expect(languageForPath('page.html')).toBe('html');
    expect(languageForPath('run.sh')).toBe('shell');
  });
  it('fallback plaintext quando desconhecido ou sem path', () => {
    expect(languageForPath(undefined)).toBe('plaintext');
    expect(languageForPath('arquivo.bak')).toBe('plaintext');
  });
});

describe('clampMenuPosition (BUG-V1 — menu nunca sai da viewport)', () => {
  const MENU_W = 180;
  const MENU_H = 240;
  it('mantém posição desejada quando cabe inteiro', () => {
    expect(clampMenuPosition(100, 100, MENU_W, MENU_H, 1280, 800)).toEqual({ x: 100, y: 100 });
  });
  it('gruda à margem direita quando estouraria a largura (painel estreito à direita)', () => {
    const { x, y } = clampMenuPosition(1180, 40, MENU_W, MENU_H, 1280, 800);
    expect(x).toBe(1280 - MENU_W - 8); // 1092
    expect(y).toBe(40);
  });
  it('gruda à margem inferior quando estouraria a altura', () => {
    const { y } = clampMenuPosition(50, 700, MENU_W, MENU_H, 1280, 800);
    expect(y).toBe(800 - MENU_H - 8); // 552
  });
  it('viewport minúscula: nunca posiciona fora da margem superior-esquerda', () => {
    const { x, y } = clampMenuPosition(900, 900, MENU_W, MENU_H, 200, 150);
    expect(x).toBeGreaterThanOrEqual(8);
    expect(y).toBeGreaterThanOrEqual(8);
  });
});
