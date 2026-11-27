// ============================================================================
// U-1 — PAINÉIS DE APRESENTAÇÃO DO MODAL UNIFICADO (shell).
//
// São telas HONESTAS: explicam o que existe e levam ao controle real. Não
// criam grant, não inventam preferência global, não oferecem ação que o
// produto ainda não tem (R02/R05/R06).
//
// Por que vivem no shell: não pertencem a Casa nenhuma (não falam com serviço
// de IA). As três Casas reais são compostas pelo App pelos seus barrels.
// ============================================================================
import { FolderOpen, HardDrive, Info, Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import type { AlvoPersonalizacoes } from '../bairros/2-inteligencia/casas/personalizacoes'
import { lerMotorDitado, salvarMotorDitado, type MotorDitado } from '../client/preferenciaDitado'

export function DitadoPainel() {
  const [motor, setMotor] = useState(lerMotorDitado)
  const [erro, setErro] = useState(false)
  function selecionar(opcao: MotorDitado) {
    try {
      salvarMotorDitado(opcao)
      setMotor(opcao)
      setErro(false)
    } catch {
      setErro(true)
    }
  }
  return <section className="config-painel" aria-label="Ditado por voz">
    <fieldset className="config-painel-opcoes">
      <legend>Reconhecimento do microfone</legend>
      <label><input type="radio" name="motor-ditado" checked={motor === 'navegador'}
        onChange={() => selecionar('navegador')} /> Navegador</label>
      <label><input type="radio" name="motor-ditado" checked={motor === 'parakeet'}
        onChange={() => selecionar('parakeet')} /> Parakeet Ultra (local)</label>
    </fieldset>
    <p className="config-painel-nota">
      O navegador pode usar um serviço externo. O Parakeet roda no computador e baixa cerca de 706 MiB no primeiro ditado.
    </p>
    {erro && <p role="alert">Não foi possível salvar a preferência de ditado neste navegador.</p>}
  </section>
}

/** Aparência: o MESMO dono de tema da barra superior (agents-theme). */
export function AparenciaPainel({ tema, onAlternarTema }: { tema: 'dark' | 'light'; onAlternarTema(): void }) {
  return (
    <section className="config-painel" aria-label="Aparência" data-painel-aparencia={tema}>
      <p className="config-painel-texto">
        O tema é o mesmo da barra superior: mudar aqui muda lá, e a escolha vale
        para a próxima abertura do aplicativo.
      </p>
      <fieldset className="config-painel-opcoes">
        <legend>Tema</legend>
        <label>
          <input
            type="radio"
            name="tema-configuracoes"
            checked={tema === 'dark'}
            onChange={() => { if (tema !== 'dark') onAlternarTema() }}
          />
          <Moon size={13} aria-hidden="true" /> <span>Escuro</span>
        </label>
        <label>
          <input
            type="radio"
            name="tema-configuracoes"
            checked={tema === 'light'}
            onChange={() => { if (tema !== 'light') onAlternarTema() }}
          />
          <Sun size={13} aria-hidden="true" /> <span>Claro</span>
        </label>
      </fieldset>
      <p className="config-painel-nota">
        <Monitor size={12} aria-hidden="true" /> Preferências de editor e fonte não fazem parte desta versão.
      </p>
    </section>
  )
}

/**
 * Permissões: explica os controles que JÁ existem na conversa e, quando há
 * contexto, mostra exatamente onde eles ficam. Nenhum toggle global, nenhum
 * grant permanente (R05). Chat sem pasta continua com os limites da C-1.
 */
export function PermissoesPainel({ alvo, temPasta }: { alvo: AlvoPersonalizacoes; temPasta: boolean }) {
  return (
    <section className="config-painel" aria-label="Permissões" data-tem-pasta={temPasta ? 'sim' : 'nao'}>
      <p className="config-painel-texto">
        As permissões são da <strong>conversa atual</strong>, não do aplicativo. Elas
        aparecem no seletor de permissão do campo de mensagem, ao lado do modelo.
      </p>
      {temPasta ? (
        <p className="config-painel-nota" data-estado-permissoes="aplicavel">
          <Info size={12} aria-hidden="true" /> Conversa atual: <code>{alvo.chatId}</code>. Os modos de
          permissão valem para esta conversa enquanto ela existir.
        </p>
      ) : (
        <p className="config-painel-nota" data-estado-permissoes="sem-pasta">
          <Info size={12} aria-hidden="true" /> Esta conversa não tem pasta. Sem uma pasta de projeto, o
          agente continua sem acesso a arquivos e comandos — é o limite definido para conversas Chat.
        </p>
      )}
      <p className="config-painel-nota">
        Esta versão não cria permissões permanentes nem regras globais.
      </p>
    </section>
  )
}

/**
 * Conversas e armazenamento: diz onde os dados ficam, sem inspecionar corpos de
 * conversa (R06). A gestão continua na lista de conversas existente.
 */
export function ConversasArmazenamentoPainel({ dataDir }: { dataDir?: string }) {
  return (
    <section className="config-painel" aria-label="Conversas e armazenamento">
      <p className="config-painel-texto">
        As conversas ficam guardadas <strong>neste computador</strong>, em um banco local
        do aplicativo. Os corpos das conversas não são lidos por esta tela.
      </p>
      {dataDir ? (
        <p className="config-painel-nota" data-localizacao>
          <HardDrive size={12} aria-hidden="true" /> Localização informada pela própria aplicação: <code>{dataDir}</code>
        </p>
      ) : (
        <p className="config-painel-nota" data-localizacao="indisponivel">
          <Info size={12} aria-hidden="true" /> A localização exata só aparece quando o aplicativo a informa;
          não é deduzida aqui.
        </p>
      )}
      <p className="config-painel-nota">
        Para apagar ou gerenciar conversas, use a lista de conversas — esta tela não oferece limpeza geral.
      </p>
    </section>
  )
}

/**
 * Workspaces: explica a regra de contexto imutável e leva à criação de uma
 * NOVA conversa com pasta. Nunca transforma a conversa atual (R06).
 */
export function WorkspacesPainel({
  onNovaSessaoComPasta,
  workspaceAtual,
}: {
  onNovaSessaoComPasta(): void
  workspaceAtual?: string | null
}) {
  return (
    <section className="config-painel" aria-label="Workspaces">
      <p className="config-painel-texto">
        O contexto de uma conversa é definido quando ela nasce e <strong>não muda depois</strong>.
        Uma conversa Chat não ganha pasta; para trabalhar com arquivos, comece uma
        conversa nova com pasta.
      </p>
      {workspaceAtual ? (
        <p className="config-painel-nota" data-workspace-atual>
          <FolderOpen size={12} aria-hidden="true" /> A conversa atual usa: <code>{workspaceAtual}</code>
        </p>
      ) : (
        <p className="config-painel-nota" data-workspace-atual="sem-pasta">
          <FolderOpen size={12} aria-hidden="true" /> A conversa atual não tem pasta.
        </p>
      )}
      <button type="button" className="config-painel-acao" onClick={onNovaSessaoComPasta} data-acao="nova-sessao-com-pasta">
        Nova sessão com pasta
      </button>
      <p className="config-painel-nota">A conversa atual permanece exatamente como está.</p>
    </section>
  )
}
