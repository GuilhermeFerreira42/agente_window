// ============================================================================
// Casa Personalizações — PROJEÇÃO DAS FERRAMENTAS REAIS (entregável d da SPEC 2H).
//
// A lista NÃO é inventada aqui: vem do catálogo real da casa Agir
// (`catalogoFerramentas`, as 7 ferramentas com título e descrição). Esta casa
// acrescenta apenas o que é dela — o agrupamento para o liga/desliga por grupo
// e o estado efetivo de cada uma.
//
// A importação é pelo BARREL da casa vizinha, que é o caminho sancionado entre
// casas (`agir/server/vizinho.ts:12` faz o mesmo com a casa Conversa, marcado
// "barrel da casa vizinha (LEGO)"). `catalogoFerramentas` é exportado por ele e
// é puro — não toca node:* —, então este módulo também é seguro para o navegador.
//
// RF14-4 é consumida por `ferramentasPermitidas`, que a prefeitura injeta na
// casa Agir; `anunciarFerramentas(protocolo, permitidas)` já filtra por ela.
// ============================================================================
import { catalogoFerramentas } from '../../agir'
import {
  ROTULO_GRUPO_FERRAMENTA,
  type EstadoPersonalizacoes,
  type FerramentaVisivel,
  type GrupoFerramenta,
} from '../contract'

/**
 * Agrupamento para o liga/desliga por grupo. Reflete a semântica que a casa
 * Agir já aplica: leitura não altera estado; criar/escrever são mexidas;
 * excluir é destrutiva e sempre passa pelo cartão do dono; executar é shell.
 */
export const GRUPO_POR_FERRAMENTA: Record<string, GrupoFerramenta> = {
  ler: 'leitura',
  listar: 'leitura',
  buscar: 'leitura',
  criar: 'escrita',
  escrever: 'escrita',
  excluir: 'destrutiva',
  executar: 'execucao',
}

/** As ferramentas reais projetadas para a tela, com o estado efetivo de cada uma. */
export function projetarFerramentas(estado: EstadoPersonalizacoes): FerramentaVisivel[] {
  const desligadas = new Set(estado.ferramentasDesligadas)
  return catalogoFerramentas.map((ferramenta) => ({
    id: ferramenta.id,
    titulo: ferramenta.titulo,
    descricao: ferramenta.descricao,
    grupo: GRUPO_POR_FERRAMENTA[ferramenta.id] ?? 'leitura',
    ligada: !desligadas.has(ferramenta.id),
  }))
}

/** Rótulos dos grupos na ordem de apresentação, só com os grupos que existem. */
export function gruposPresentes(ferramentas: readonly FerramentaVisivel[]): { grupo: GrupoFerramenta; rotulo: string }[] {
  const ordem: GrupoFerramenta[] = ['leitura', 'escrita', 'destrutiva', 'execucao']
  return ordem
    .filter((grupo) => ferramentas.some((ferramenta) => ferramenta.grupo === grupo))
    .map((grupo) => ({ grupo, rotulo: ROTULO_GRUPO_FERRAMENTA[grupo] }))
}

/**
 * A lista que a prefeitura injeta na casa Agir para o anúncio ao modelo
 * (RF14-4). **Ordem preservada do catálogo real.** Se todas estiverem
 * desligadas, devolve lista vazia — o anúncio sai sem ferramenta nenhuma, que é
 * exatamente o que "desligada some do anúncio" significa.
 *
 * Ids que o dono tenha gravado mas que não existem no catálogo são ignorados:
 * o catálogo é a autoridade, não o estado.
 */
export function ferramentasPermitidas(estado: EstadoPersonalizacoes): string[] {
  const desligadas = new Set(estado.ferramentasDesligadas)
  return catalogoFerramentas.map((ferramenta) => ferramenta.id).filter((id) => !desligadas.has(id))
}
