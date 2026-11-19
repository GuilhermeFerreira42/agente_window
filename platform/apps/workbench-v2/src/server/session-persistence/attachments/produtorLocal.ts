// ============================================================================
// C-3b — T25/T30: PRODUTOR LOCAL injetado (test seam), fora de produção.
//
// Existe para provar a tubulação COMPLETA sem depender de um provedor de IA:
//
//   produtor → publicarArtefatoGerenciado → ledger → envelope MM-0 →
//   publicação da mensagem → reabertura → UI
//
// Duas travas deliberadas (T30):
//   1. `criarProdutorLocal` só existe quando chamado explicitamente pela
//      composição de TESTE; nenhuma rota HTTP o alcança.
//   2. Em produção (`NODE_ENV=production`) a fábrica recusa criar o produtor,
//      então não há "rota pública de run forjado".
//
// O que ele NÃO é: codec, interpretação de imagem, geração por IA. Os bytes
// vêm de uma fixture local. Nada aqui afirma capacidade de modelo — isso é
// MM-I/MM-O.
// ============================================================================
import { createHash } from 'node:crypto'
import { PersistenceProblem } from '../persistenceErrors'
import { publicarArtefatoGerenciado, type IdentidadeGeracao } from './gerados'

export interface PartsDoProdutor {
  textoAntes?: string
  textoDepois?: string
  /** Bytes a publicar como artefato (fixture local, nunca rede). */
  bytes: Buffer
  nome: string
  modalidade: 'imagem' | 'audio' | 'video' | 'arquivo'
}

export interface ResultadoDoProdutor {
  messageId: string
  content: string
  artefatos: Array<{ artifactId: string; modalidade: string; name: string }>
  partes: Array<{ partId: string; tipo: 'texto' | 'artefato'; texto?: string; artifactId?: string; modalidade?: string }>
}

export interface ProdutorLocal {
  produzir(entrada: {
    sessionId: string
    chatId: string
    runId: string
    generation: number
    messageId: string
    parts: PartsDoProdutor
  }): Promise<ResultadoDoProdutor>
}

/** Por que a fábrica pode recusar: não há seam de teste em produção. */
export function produtorLocalPermitido(ambiente: string | undefined = process.env.NODE_ENV): boolean {
  return ambiente !== 'production'
}

/**
 * Cria o produtor. `publicar` é injetável para que o TESTE possa forçar falhas
 * determinísticas na fronteira (T17/E07/E08) sem mexer no produto.
 */
export function criarProdutorLocal(opcoes: {
  publicar?: typeof publicarArtefatoGerenciado
  ambiente?: string
  appDir?: string
} = {}): ProdutorLocal {
  if (!produtorLocalPermitido(opcoes.ambiente)) {
    throw new PersistenceProblem(403, 'test_seam_unavailable',
      'O produtor local de teste não existe em produção.')
  }
  const publicar = opcoes.publicar ?? publicarArtefatoGerenciado

  return {
    async produzir(entrada) {
      const { parts } = entrada
      if (parts.bytes.length === 0) {
        // Resposta vazia sem artefato não vira mensagem artificial (T04).
        throw new PersistenceProblem(400, 'empty_production',
          'O produtor não tem conteúdo útil para publicar.')
      }

      const identidade: IdentidadeGeracao = {
        sessionId: entrada.sessionId,
        chatId: entrada.chatId,
        runId: entrada.runId,
        generation: entrada.generation,
        messageId: entrada.messageId,
        partId: `${entrada.messageId}:1`,
        tentativa: entrada.runId,
        name: parts.nome,
      }
      const publicado = await publicar(identidade, parts.bytes, {
        ...(opcoes.appDir === undefined ? {} : { appDir: opcoes.appDir }),
      })

      // A ORDEM é a que o produtor emitiu — texto, artefato, texto.
      const partes: ResultadoDoProdutor['partes'] = []
      if (parts.textoAntes) {
        partes.push({ partId: `${entrada.messageId}:0`, tipo: 'texto', texto: parts.textoAntes })
      }
      partes.push({
        partId: `${entrada.messageId}:1`, tipo: 'artefato',
        artifactId: publicado.artifactId, modalidade: parts.modalidade,
      })
      if (parts.textoDepois) {
        partes.push({ partId: `${entrada.messageId}:2`, tipo: 'texto', texto: parts.textoDepois })
      }

      return {
        messageId: entrada.messageId,
        // `content` é a projeção textual (contrato §1), não outra fonte.
        content: [parts.textoAntes, parts.textoDepois].filter(Boolean).join(''),
        artefatos: [{ artifactId: publicado.artifactId, modalidade: parts.modalidade, name: parts.nome }],
        partes,
      }
    },
  }
}

/** Envelope MM-0 a partir do resultado — o formato que vai para a mensagem. */
export function envelopeDoResultado(resultado: ResultadoDoProdutor) {
  return {
    versao: 1 as const,
    messageId: resultado.messageId,
    partes: resultado.partes.map((parte) =>
      parte.tipo === 'texto'
        ? { partId: parte.partId, tipo: 'texto' as const, texto: parte.texto ?? '' }
        : {
          partId: parte.partId,
          tipo: 'artefato' as const,
          artifactId: parte.artifactId!,
          modalidade: parte.modalidade as 'imagem' | 'audio' | 'video' | 'arquivo',
        },
    ),
  }
}

/** Hash de conveniência para o teste provar que os bytes servidos são os mesmos. */
export function hashDe(conteudo: Buffer): string {
  return createHash('sha256').update(conteudo).digest('hex')
}
