# 03E - Integrações e Dependências: Right Sidebar

## 1. Dependências de Framework (Base)
- **`AbstractPaneCompositePart`**: A Right Sidebar não é um componente isolado, mas uma implementação de um "Composite Part". Ela herda toda a lógica de gerenciamento de painéis, abas e redimensionamento.
- **`IInstantiationService`**: Utilizado para criar instâncias de trackers (ex: `VisibleViewContainersTracker`) via Injeção de Dependência.

## 2. Integrações com Outros Subsistemas do Workbench
### Layout Service (`IWorkbenchLayoutService`)
É a dependência mais crítica. A Right Sidebar delega a gestão de sua existência (visibilidade) e sua geometria (está maximizada? qual a largura?) para este serviço.

### View Service (`IViewDescriptorService`)
A barra é um "host" passivo. Ela não sabe *o que* exibir; ela pergunta ao `ViewDescriptorService` quais views foram registradas para o local `AuxiliaryBar` e as renderiza dinamicamente.

### Theme Service (`IThemeService`)
Consome tokens de cores específicos (`SIDE_BAR_BACKGROUND`, `SIDE_BAR_BORDER`) para garantir que a barra secundária tenha a mesma aparência da primária, independentemente do tema instalado.

## 3. Pontos de Acoplamento (Tight Coupling)
- **`Parts` Enum**: O uso de `Parts.AUXILIARYBAR_PART` cria um acoplamento forte com o `LayoutService`, que usa essa string como chave única para identificar a parte no grafo de layout.
- **`ActivityBarPosition`**: A lógica de exibição da barra secundária é intrinsecamente ligada à posição da Activity Bar (topo/baixo/esquerda/direita), criando uma dependência funcional entre as duas.

## 4. Fluxo de Dependência de Dados
`Configurações do Usuário` $\rightarrow$ `IConfigurationService` $\rightarrow$ `AuxiliaryBarPart` $\rightarrow$ `Estilos/Layout da UI`.
