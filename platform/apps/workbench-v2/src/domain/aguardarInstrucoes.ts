// Reconhecimento conservador de um pedido exclusivamente de espera. Não tenta
// interpretar instruções mistas ou contraditórias: nesses casos vale o diálogo.
export function pediuSomenteAguardar(texto: string): boolean {
  const frase = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[.!?]+$/u, '').trim()
  return /^(?:(?:por favor|favor),?\s+)?(?:aguarde|espere|aguardar|esperar)\s+(?:(?:novas|mais|proximas)\s+)?instrucoes(?:,?\s+por favor)?$/u.test(frase)
}
