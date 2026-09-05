# 00 - ÍNDICE GERAL - VALIDAÇÃO 2 PARA PRODUÇÃO

## Contexto Blind Testing (Teste Cego)
Este pacote é um **Teste Cego** no modelo que você já conhece:
- Você recebe **todo o contexto**: vídeo demonstrativo, código completo (projeto_restaurado.zip com 3.803 arquivos), documentação original em `01_original/sessions/`, checklist de requisitos, prints do vídeo.
- **Sem viés de confirmação**: Não há indicação prévia do que deveria funcionar. Você deve descobrir sozinho comparando ORIGINAL x RÉPLICA.
- Tecnologia: **Playwright** (Microsoft) para E2E Testing - robô que clica em tudo, tira screenshots e valida fluxo ponta-a-ponta.

O que foi feito antes:
- Validação 1 estática (só leitura de código): 22 OK (25,3%), 14 ENFEITE, 5 MOCK, 8 SO_DOMINIO, 31 FALTA, 7 N/A = 87 requisitos. Conformidade real ~27,5%.
- Seu teste cego anterior identificou bugs mas a réplica ainda era "casa de fachada" - carro de exibição sem motor.

O que o vídeo prova (4min27s):
- [00:05] Réplica inicia com 2 barras abertas mas não respeita estado do usuário
- [00:33] Novo chat inicia com layout errado, só fica certo quando apaga TODOS os chats
- [01:11] Arquivos no Explorer não abrem ao clicar, só se mandar "oi" - depois trava total
- [01:45] Mesmo código repetido pra todos arquivos (const a=1) - MOCK
- [01:56] Botão "Escolher pasta real" é só desenho, não chama file picker
- [02:35] Layout totalmente diferente do original
- [03:13] Original tem vários chats por pasta/workspace - réplica não tem

## Objetivo Final
Transformar de **DEMO/SIMULAÇÃO** para **PRODUÇÃO 100% funcional**:
- Arquivos reais via File System Access API
- Layout com memória real via localStorage
- Browser contextual por sessão
- Vários chats por workspace
- Menu contexto, drag&drop, teclado
- Build sem erros, 0 mocks

## Estrutura de Trabalho - ORDEM OBRIGATÓRIA
Trabalhar em ordem, uma sessão por vez, com E2E após cada uma:
1. 04_SESSAO_LAYOUT_CONTROLLER - corrige portas que batem sozinhas (mais crítico do vídeo)
2. 03_SESSAO_LAYOUT + 05_SESSAO_SINGLE_PANE - topologia
3. 02_SESSAO_SESSIONS_LIST - remove filtros esquisitos, implementa Fixadas/Hoje/Ontem + vários chats por pasta
4. 07_SESSAO_BROWSER_EDITOR - abre arquivos sem precisar mandar oi
5. 08_SESSAO_FILESYSTEM_WORKSPACE - escolher pasta real
6. 09_SESSAO_BUGS_CRITICOS - context menu, drag&drop, teclado
7. 01_SESSAO_SESSIONS_CORE + 06_MOBILE + 10_PRODUCAO

## Como usar o ZIP gigante
- NÃO extraia os 3.803 arquivos soltos (limite IA 2048). Use:
```python
import zipfile
zip_path = '/mnt/data/projeto_restaurado.zip'
with zipfile.ZipFile(zip_path) as z:
    content = z.read('...02_replica/src/App.tsx').decode('utf-8')
```
- Se precisar extrair, extraia SÓ `02_replica/src` (103 arquivos)

## Entregáveis por Sessão
Cada pasta tem:
- COMPARACAO.md - original vs réplica
- TAREFA.md - o que fazer, arquivos afetados, lógica
- TESTE.md - como validar com Playwright
- EVIDENCIAS/ - prints do vídeo daquela sessão

## Prints Brutos
Todos em `00_PRINTS_BRUTOS_DO_VIDEO/` - 7 imagens extraídas do vídeo original.
