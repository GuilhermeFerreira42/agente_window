# Fatia 06 — Chat Carcaça & Janela de Agentes

> **Status:** Especificação e Engenharia Reversa Alinhadas à Máquina Real  
> **Referência Oficial:** VS Code 1.135.0 (perfil "Janela Agentes" / `@github/copilot` no Windows 11)  
> **Data:** 2026-10-04  
> **Base de Código:** `platform/apps/workbench-v2/` (Fatia 5 100% homologada)

---

## ⚠️ Regras Sagradas e Perímetro Blindado

1. **Lado Direito INTOCÁVEL:**  
   A `Side Bar` (Explorer, Search, SCM com largura 274px / 170–300px), a `Activity Bar` (48px) e o sash de 4px estão **100% homologados** na Fatia 5. **Zero linhas alteradas**. É expressamente proibido criar colunas extras ou sobrepor a barra de arquivos.
2. **Terminal Inferior INTOCÁVEL:**  
   O `TerminalPanel` (PTY real, xterm.js) continua exatamente como está. **Zero linhas alteradas**.
3. **Escopo Único da Fatia 06:**  
   - **Coluna da Esquerda (`SessionSidebar`):** Deixar de usar dados simulados (`src/data.ts`) e implementar a criação, listagem, seleção e persistência real de sessões agrupadas pelo workspace (`agente_window`).
   - **Coluna Central (`SessionLanding` + `ChatPanel` / `ChatInput`):** Empty State centralizado de 768px com transição automática: ao enviar a primeira mensagem ou selecionar sessão existente, o Empty State fecha, o cabeçalho superior assume a sessão ativa e o input ancora no rodapé sob o histórico de mensagens.
4. **Remoção de Simulações (Mocks):**  
   Desacoplar os mocks estáticos de `src/data.ts` (`initialSessions`, `setupMessages`, etc.) para dar lugar ao serviço real de sessões e histórico.

---

## Documentos da Fatia 06

1. 📐 **[`GUIA_VISUAL_E_MEDIDAS.md`](./GUIA_VISUAL_E_MEDIDAS.md):**
   * Medidas reais do VS Code 1.135.0.
   * Empty state centralizado de 768px e ancoragem no rodapé.
   * Dimensões da coluna da esquerda e preservação da coluna direita.

2. ⚙️ **[`COMPORTAMENTO_DOS_BOTOES.md`](./COMPORTAMENTO_DOS_BOTOES.md):**
   * Comportamento do botão `Novo [Ctrl+N]`.
   * Seleção e alternância de sessões reais.
   * Transição automática do estado vazio para a thread ativa.

3. ⚛️ **[`PLANO_DE_COMPONENTES_REACT.md`](./PLANO_DE_COMPONENTES_REACT.md):**
   * Adaptação dos componentes React existentes (`SessionSidebar.tsx`, `SessionLanding.tsx`, `ChatPanel.tsx`, `ChatInput.tsx`) sem quebrar `App.tsx` nem a arquitetura LEGO.
