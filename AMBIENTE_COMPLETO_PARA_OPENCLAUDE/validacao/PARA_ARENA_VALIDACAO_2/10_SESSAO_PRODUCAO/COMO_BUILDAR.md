# 10 - PRODUÇÃO - COMO BUILDAR E VALIDAR 100%

## Build
```bash
# Extrair só réplica (103 arquivos) para não estourar limite
python3 restore_to_zip.py codigo_completo.txt projeto.zip
unzip projeto.zip "*/02_replica/*" -d /tmp/replica
cd /tmp/replica/ENTREGA/02_replica
npm install
npm run build
npm run test -- 348/348 passando
```

## E2E Testing com Playwright (tecnologia Microsoft)
Playwright é o robô que clica em tudo:
```bash
npm install -D @playwright/test
npx playwright install
npx playwright test
```

## O que o robô deve fazer (fluxo ponta-a-ponta):
1. Abrir app
2. Validar layout inicial sem esconder laterais (bug 00:33)
3. Escolher pasta real (bug 01:56)
4. Abrir arquivo sem mandar oi (bug 01:11)
5. Criar 3 sessões no mesmo workspace, validar vários chats por pasta (bug 03:13)
6. Drag & drop sessão
7. Botão direito menu contexto
8. Hide/Show editor 10x sem crash
9. F5 e validar persistência
10. Tirar 24 screenshots do tour completo (como foi feito na validação anterior que deu 348/348 testes passando)

## Métricas de produção:
- 0 erros TypeScript
- 348/348 testes unitários passando
- 24 screenshots E2E
- 0 mocks (todos arquivos reais)
- Build < 2s
- Sem console errors

## Entrega final:
- Código em /ENTREGA/02_replica/src sem MOCK/ENFEITE
- Relatório VALIDACAO_2.md com prints comparativos
- test-results/ com screenshots
