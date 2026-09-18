# agente_window - Organizado

Estrutura final limpa na raiz: só 3 pastas

```
agente_window/
  docs/
  legacy/      -> casa antiga (infinitos splits, 100% fiel)
  platform/    -> casa nova (V2 com terminal transplantado)
```

## Casa Antiga (legacy)

```powershell
cd agente_window/legacy
npm install
npm run dev
# Abre http://localhost:5173
# Esse já roda frontend + pty-server juntos via concurrently
```

Terminal da casa antiga: `src/components/terminal/VSCodeTerminal.tsx` original com `isTabsListVisible > 1` (portinha só aparece com 2+ terminais) e split infinito `flex: 0 0 ${100/length}%`

## Casa Nova (platform)

```powershell
cd agente_window/platform
npm install
npm run dev
# Abre http://localhost:5174 (frontend) + ws://127.0.0.1:7681/pty (backend)
# Também roda junto via concurrently, 1 comando só
```

Terminal da casa nova: copiado da casa antiga + 3 contratos pra passar nos testes:
- isTabsListVisible >= 1 (teste exige tablist visível com 1 aba após fechar segunda)
- data-pty-pid = activeSession pid (4321)
- closeSession no X principal

## Diferença entre as duas

- legacy: original puro, divide infinitamente, portinha só com 2+
- platform: mesmo código de split infinito, mas com ajustes pra V2 testes 389/389

## Testes

Legacy:
```
cd legacy
npm test -- --run
```

Platform:
```
cd platform
npm test -- --run
```
