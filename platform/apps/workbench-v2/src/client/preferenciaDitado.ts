export type MotorDitado = 'navegador' | 'parakeet'

const CHAVE = 'agents-dictation-engine'

export function lerMotorDitado(): MotorDitado {
  try {
    return window.localStorage.getItem(CHAVE) === 'parakeet' ? 'parakeet' : 'navegador'
  } catch {
    return 'navegador'
  }
}

export function salvarMotorDitado(motor: MotorDitado): void {
  window.localStorage.setItem(CHAVE, motor)
}
