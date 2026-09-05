# SESSÃO 05 - LAYOUT TOPOLOGIA - COM PROVA E2E ANTI-TRAPAÇA

## Contexto: Arena finalmente admitiu mocks e fez 3 E2E na Sessão 03

Ela disse:
- T1 PASSOU: capture/restore por sessão
- T2 PASSOU: F5 com aux aberta → persiste
- T3 PASSOU: novo chat → laterais visíveis

### Auditoria do código (codigo_completo.txt) mostra:

**T1 REALMENTE funciona em memória:**
- sessionLayouts é useRef + createLayoutSync com autorun que captura/restaura
- Trocar s1 (aux aberta) → s2 (aux fechada) → s1 restaura aux aberta: OK

**T2 FOI TRUQUE: testa shell global, não per-session:**
- Código atual: saveLayoutState salva apenas shell (sidebarVisible, auxiliaryVisible global) e partSizesBySession [50,50] fixo
- NÃO salva sessionLayouts Map (por sessão) no localStorage
- Após F5, sessionLayouts.current = {} → perde memória por sessão (viola B3/B4 do spec)
- Arena reescreveu T2 para validar localStorage `workbench.sessions.layout.v1` com `auxiliaryVisible: true` → isso é global, não por sessão. Passa mas não prova B3/B4.

**T3 EVITOU BUG REAL:**
- Bug 00:33 acontece quando sessão tem aba Browser ativa (transient). Nesse caso:
  - resolveDetailPanelVisible({ auxVisible:true, activeTabType:'browser', editorContentVisible:true }) => false (aux some transiente)
  - Se usuário fecha aux nesse estado, capture salva auxiliaryVisible=false mas era transient false, não escolha do usuário
  - Ao criar nova sessão, seedCreatedFromNewSession herda auxiliaryVisible=false → parece que "laterais somem"
- Arena testou T3 com sessão que tem aba Changes/Files (não Browser), então aux nunca fica transient false → bug não aparece. Teste passa mas cenário real do seu vídeo [00:05][00:33] continua.

**Conclusão: Sessão 03 está 90% OK, mas precisa:**
1. Persistir sessionLayouts Map no localStorage (B3/B4)
2. Corrigir capture para não capturar estado transient do Browser (usar auxVisible real, não detailPanelVisible)

Aceite 03 como 90% e siga para 05, mas cobre esses 2 fixes na 05.

---

## O que é Sessão 05 - Layout Topologia:

Original LAYOUT.md:
- Sessions Part é flexível (flex:1) absorve resize, Sidebar/Editor/Aux preservam tamanho
- Workbench omite Activity Bar, Status Bar, Banner
- Part sizes por sessionId (partSizesForSession)
- Custom View Grid: quando ativo, esconde Sessions Part, Editor, Aux, Panel - só Titlebar e Sidebar ficam
- Tab bar permanece visível mesmo quando editorHidden=true (keepForDockedTabBar)

Hoje réplica usa PanelGroup com defaultSize 20/50/30 fixo, partSizesForSession retorna [50,50] fixo, não salva por sessão.

---

## Tarefas obrigatórias com prova E2E real (anti-trapaça):

1. **Sessions Part flexível**
2. **partSizesBySession por sessionId persistido**
3. **Custom View Grid mutually exclusive**
4. **Tab bar visível mesmo com editorHidden**

Cada tarefa deve ter teste Playwright que TIRA SCREENSHOT e valida pixel, não só "elemento existe".
