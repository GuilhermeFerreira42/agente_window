# 03 — ARQUITETURA NOVA FUNDAÇÃO — DOC-02

## Estrutura alvo

```
platform/
  packages/
    contracts/
      filesystem.ts
      explorer.ts
      editor.ts
      search.ts
      browser.ts
      terminal.ts
    shared/
    agent-runtime/
      filesystem/
      explorer/
      editor/
      search/
      browser/
      terminal/
  services/
    pty-server/ (já existe)
    browser-runtime/ (futuro)
  apps/
    workbench-v2/
      src/
        App.tsx (shell modular, visual idêntico ao legacy 95KB)
        components/
          Titlebar/
          ActivityBar/
          SideBar/
          ExplorerView/
          EditorArea/
          TerminalPanel/
          StatusBar/
        domain/
          layout/
          session/
          explorer/
          editor/
          terminal/
        styles/
          app.css
```

## Regras modulares
- Cada domain/* só exporta via index.ts
- Componente só importa contrato, nunca interno de outro domain
- Comunicação via eventos
- CSS via vars --vscode-*
- Typecheck 0 erros obrigatório

## Descontinuação
- platform/apps/workbench/ atual (baseado em vídeo) deve ser arquivado como workbench-old-video/
- Nova fundação é workbench-v2, que depois vira workbench
