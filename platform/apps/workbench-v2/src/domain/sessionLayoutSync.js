// R-030 — Gatilho de troca de sessão orientado a observable (LAYOUT_CONTROLLER.md §2).
//
// "All state flows from the `activeSession` observable (never events)." O
// controller deriva `activeSessionResourceObs` e reage com um `autorun` que
// mantém um `previousSessionResource` local para distinguir uma **troca real**
// (`previous !== active`) de um load inicial ou re-avaliação não relacionada.
//
// Além disso (§2 Multiple visible sessions): quando mais de uma sessão está
// visível no grid, TODO o sync por sessão é suprimido, e um autorun dedicado
// LIMPA o estado por sessão de cada sessão visível, garantindo que, ao colapsar
// de volta para uma sessão, a lógica de visibilidade padrão rode de novo em vez
// de restaurar estado obsoleto.
//
// Este módulo NÃO conhece React: recebe os observables de entrada e os callbacks
// de efeito (capturar/restaurar/limpar), e devolve um dispose. Assim o gatilho é
// unitariamente testável com o motor de `observable.ts`.
import { autorun } from './observable';
export function createLayoutSync(inputs, effects, options = {}) {
    // Estado local do controller (LAYOUT_CONTROLLER.md §2: "keeps a local
    // previousSessionResource"). Vive fora do autorun para sobreviver às re-runs.
    let previousSessionResource = options.initialPreviousResource;
    // Autorun principal: reage à sessão ativa + ao flag multi-sessão.
    const switchRun = autorun('layoutSync.switch', () => {
        const active = inputs.activeSessionResource.get();
        const multiple = inputs.multipleSessionsVisible.get();
        // Em modo multi-sessão o sync por sessão é suprimido por completo. Ainda
        // assim acompanhamos `previous` para que, ao colapsar, a próxima troca seja
        // detectada corretamente.
        if (multiple) {
            previousSessionResource = active;
            return;
        }
        // Detecta troca real: previous !== active. Load inicial (previous undefined
        // → primeira sessão) restaura, mas não captura (não há de onde capturar).
        if (previousSessionResource === active)
            return;
        if (previousSessionResource !== undefined) {
            effects.captureOutgoing(previousSessionResource);
        }
        if (active !== undefined) {
            effects.restoreIncoming(active);
        }
        previousSessionResource = active;
    });
    // Autorun de supressão: enquanto múltiplas sessões estão visíveis, limpa o
    // estado por sessão de todas elas (§2).
    const suppressionRun = autorun('layoutSync.suppression', () => {
        const multiple = inputs.multipleSessionsVisible.get();
        const resources = inputs.visibleSessionResources.get();
        if (!multiple)
            return;
        effects.clearVisibleSessionState(resources);
    });
    return {
        dispose() {
            switchRun.dispose();
            suppressionRun.dispose();
        },
        setPreviousResource(resource) {
            previousSessionResource = resource;
        },
    };
}
//# sourceMappingURL=sessionLayoutSync.js.map