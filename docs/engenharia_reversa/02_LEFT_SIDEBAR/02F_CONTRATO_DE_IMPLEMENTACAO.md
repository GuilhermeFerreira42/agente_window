# 02F — Contrato de Implementação: Left Sidebar

## Objetivo
Definir a implementação da barra lateral primária, incluindo activity bar, containers de views e seleção de viewlet.

## Responsabilidade do módulo
Hospedar a navegação principal do workbench e renderizar, por registro e contexto, views como Explorer, Search e outras futuras.

## Fronteiras obrigatórias
- UI renderiza ícones, badges, containers e estados visuais.
- Workbench controla visibilidade, largura e posição.
- Lógica resolve qual view está ativa e quais actions estão disponíveis.

## Contratos mínimos
```ts
interface ViewContainerDescriptor {
  id: string;
  title: string;
  location: 'leftSidebar';
  order: number;
  when?: string;
}

interface LeftSidebarService {
  registerContainer(descriptor: ViewContainerDescriptor): () => void;
  activateContainer(id: string): void;
  listVisibleContainers(): ViewContainerDescriptor[];
}
```

## Eventos mínimos
| Evento | Origem | Efeito |
|---|---|---|
| `viewContainer.registered` | Lógica | container passa a existir no rail |
| `viewContainer.activated` | UI/Lógica | conteúdo correspondente é exibido |
| `leftSidebar.visibilityChanged` | Workbench | layout recalcula largura |

## Proibições
- não hardcodar todas as views na UI sem registro;
- não acoplar Left Sidebar a um único módulo de conteúdo;
- não perder seleção ativa ao alternar visibilidade, salvo regra explícita.
