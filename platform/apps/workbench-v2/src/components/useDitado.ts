import { useLayoutEffect, useRef, useState } from 'react'
import { prepararWavDitado } from '../client/audioDitado'
import { lerMotorDitado } from '../client/preferenciaDitado'
import { ROTA_DITADO, SEGUNDOS_DITADO } from '../domain/ditado'

interface Reconhecimento {
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((evento: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

type JanelaDitado = Window & {
  SpeechRecognition?: new () => Reconhecimento
  webkitSpeechRecognition?: new () => Reconhecimento
}

interface OperacaoDitado {
  parar?: () => void
  cancelar(): void
}

type FaseDitado = 'preparando' | 'gravando' | 'transcrevendo'

export function useDitado(chave: string, inserir: (texto: string) => void) {
  const ativa = useRef<OperacaoDitado | null>(null)
  const [fase, setFase] = useState<FaseDitado>()
  const [aviso, setAviso] = useState<string>()
  const [motor, setMotor] = useState<ReturnType<typeof lerMotorDitado>>('navegador')

  useLayoutEffect(() => {
    setFase(undefined)
    setAviso(undefined)
    return () => {
      const operacao = ativa.current
      ativa.current = null
      operacao?.cancelar()
    }
  }, [chave])

  function encerrar(operacao: OperacaoDitado, aviso?: string) {
    if (ativa.current !== operacao) return
    ativa.current = null
    operacao.cancelar()
    setFase(undefined)
    setAviso(aviso)
  }

  function cancelar() {
    if (ativa.current) encerrar(ativa.current)
  }

  function iniciarNavegador() {
    const navegador = window as JanelaDitado
    const Construtor = navegador.SpeechRecognition ?? navegador.webkitSpeechRecognition
    if (!Construtor) {
      setAviso('Reconhecimento indisponível neste navegador. Escolha Parakeet Ultra em Configurações.')
      return
    }
    const reconhecimento = new Construtor()
    const operacao: OperacaoDitado = {
      parar: () => reconhecimento.stop(),
      cancelar: () => {
        reconhecimento.onresult = reconhecimento.onerror = reconhecimento.onend = null
        reconhecimento.abort()
      },
    }
    ativa.current = operacao
    reconhecimento.lang = 'pt-BR'
    reconhecimento.onresult = evento => {
      const texto = evento.results[0]?.[0]?.transcript?.trim()
      if (ativa.current === operacao && texto) inserir(texto)
    }
    reconhecimento.onerror = () => encerrar(operacao, 'Falha no reconhecimento. Verifique a permissão do microfone.')
    reconhecimento.onend = () => encerrar(operacao)
    try {
      setFase('gravando')
      reconhecimento.start()
    } catch {
      encerrar(operacao, 'Não foi possível iniciar o reconhecimento do navegador.')
    }
  }

  async function iniciarParakeet() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== 'function' || typeof OfflineAudioContext !== 'function') {
      setAviso('O navegador não disponibilizou a gravação por microfone.')
      return
    }
    const controle = new AbortController()
    let stream: MediaStream | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const liberar = () => {
      clearTimeout(timer)
      stream?.getTracks().forEach(faixa => faixa.stop())
    }
    const operacao: OperacaoDitado = { cancelar: () => { controle.abort(); liberar() } }
    ativa.current = operacao
    setFase('preparando')
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
      if (ativa.current !== operacao) {
        liberar()
        return
      }
      const gravador = new MediaRecorder(stream)
      const partes: Blob[] = []
      let bytes = 0
      gravador.ondataavailable = ({ data }) => {
        if (ativa.current !== operacao) return
        bytes += data.size
        if (bytes > 8 * 1024 * 1024) encerrar(operacao, 'A gravação excedeu o tamanho permitido.')
        else if (data.size) partes.push(data)
      }
      gravador.onerror = () => encerrar(operacao, 'Não foi possível gravar o ditado.')
      gravador.onstop = async () => {
        liberar()
        if (ativa.current !== operacao) return
        setFase('transcrevendo')
        try {
          const wav = await prepararWavDitado(new Blob(partes, { type: gravador.mimeType }))
          if (ativa.current !== operacao) return
          const resposta = await fetch(ROTA_DITADO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: wav,
            signal: controle.signal,
          })
          const resultado = await resposta.json() as { texto?: string; message?: string }
          if (ativa.current !== operacao) return
          if (resposta.ok && resultado.texto) inserir(resultado.texto)
          encerrar(operacao, resposta.ok ? undefined : resultado.message ?? 'Não foi possível transcrever o ditado.')
        } catch {
          encerrar(operacao, 'Não foi possível transcrever o ditado.')
        }
      }
      operacao.parar = () => {
        if (gravador.state === 'recording') gravador.stop()
        liberar()
      }
      gravador.start(250)
      timer = setTimeout(parar, SEGUNDOS_DITADO * 1000)
      setFase('gravando')
    } catch {
      encerrar(operacao, 'Não foi possível gravar. Verifique a permissão do microfone.')
    }
  }

  function iniciar() {
    if (ativa.current) return
    setAviso(undefined)
    const escolhido = lerMotorDitado()
    setMotor(escolhido)
    try {
      if (escolhido === 'parakeet') void iniciarParakeet()
      else iniciarNavegador()
    } catch {
      setAviso('Não foi possível iniciar o ditado.')
    }
  }

  function parar() {
    const operacao = ativa.current
    if (!operacao?.parar) return
    const finalizar = operacao.parar
    operacao.parar = undefined
    setFase('transcrevendo')
    try { finalizar() } catch { encerrar(operacao, 'Não foi possível finalizar o ditado.') }
  }

  return { fase, aviso, motor, iniciar, parar, cancelar }
}
