// ============================================================================
// C-3b — SAÍDA DE TESTE: composição do produtor local na porta REAL do servidor.
//
// Por que existe: a matriz de aceite (E05/E06) exige que a resposta multimodal
// percorra o caminho de verdade — produtor → `publicarArtefatoGerenciado`
// (writer/ledger/quota/journal da C-3a) → envelope MM-0 → publicação da
// mensagem via P-A/P-B → reabertura → UI. Semear JSON pronto não prova nada
// disso, e importar o tipo num teste também não.
//
// Fronteiras (todas verificáveis por leitura de fonte):
//   - Este módulo NUNCA é alcançado por rota HTTP: `rotas.ts` não o importa.
//   - Quem o instancia é a composição do Vite (`vite.config.ts`), e só quando
//     a variável de teste está ligada; em `NODE_ENV=production` a fábrica do
//     produtor recusa (403 `test_seam_unavailable`).
//   - Os BYTES são lidos da fixture local no servidor, nunca de URL/path que
//     o navegador mande.
//   - O gatilho do navegador é apenas "peça uma resposta": ele não escolhe
//     path, URL, run, geração nem nome de arquivo.
// ============================================================================
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { Attachment, ChatMessage } from '../../../types'
import { criarProdutorLocal, envelopeDoResultado, produtorLocalPermitido } from './produtorLocal'

export interface SaidaDeTeste {
  /** Produz a mensagem de resposta (texto/artefato/texto) já com envelope MM-0. */
  produzirResposta(entrada: {
    sessionId: string
    chatId: string
    /** Identidade da tentativa: reentrega do mesmo pedido não duplica artefato. */
    runId: string
    generation: number
  }): Promise<ChatMessage>
}

export interface OpcoesSaidaDeTeste {
  /** Diretório das fixtures locais (resolvido pela composição, não pelo browser). */
  fixturesDir: string
  /** Nome do arquivo de fixture — sempre relativo e conhecido. */
  arquivo: string
  nome: string
  modalidade: 'imagem' | 'audio' | 'video' | 'arquivo'
  textoAntes?: string
  textoDepois?: string
  /** Injeta falha determinística na fronteira (E07). */
  publicar?: Parameters<typeof criarProdutorLocal>[0] extends infer O
    ? O extends { publicar?: infer P } ? P : never
    : never
}

/**
 * Monta a saída. Recusa em produção ANTES de qualquer I/O, para que a
 * inexistência do seam não dependa do conteúdo pedido.
 */
export function montarSaidaDeTeste(opcoes: OpcoesSaidaDeTeste, ambiente: string | undefined = process.env.NODE_ENV): SaidaDeTeste {
  if (!produtorLocalPermitido(ambiente)) {
    throw new Error('A saída de teste não existe em produção.')
  }
  const produtor = criarProdutorLocal({
    ambiente,
    ...(opcoes.publicar ? { publicar: opcoes.publicar } : {}),
  })

  return {
    async produzirResposta(entrada) {
      const messageId = `resposta-${randomUUID()}`
      const bytes = readFileSync(`${opcoes.fixturesDir}/${opcoes.arquivo}`)
      const resultado = await produtor.produzir({
        sessionId: entrada.sessionId,
        chatId: entrada.chatId,
        runId: entrada.runId,
        generation: entrada.generation,
        messageId,
        parts: {
          ...(opcoes.textoAntes ? { textoAntes: opcoes.textoAntes } : {}),
          ...(opcoes.textoDepois ? { textoDepois: opcoes.textoDepois } : {}),
          bytes,
          nome: opcoes.nome,
          modalidade: opcoes.modalidade,
        },
      })

      const agora = new Date()
      const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
      // O anexo publicado existe no ledger: a UI classifica, pré-visualiza e
      // baixa sem adivinhar nada pela extensão.
      const anexos: Attachment[] = resultado.artefatos.map((artefato) => ({
        id: artefato.artifactId,
        artifactId: artefato.artifactId,
        name: artefato.name,
        kind: 'local',
        modalidade: artefato.modalidade as Attachment['modalidade'],
        estado: 'pronto',
      }))
      return {
        id: messageId,
        role: 'assistant',
        content: resultado.content,
        time: hora,
        attachments: anexos,
        multimodal: envelopeDoResultado(resultado),
      }
    },
  }
}
