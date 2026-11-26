// Subprocessos não recebem chaves de provedores ou o ambiente inteiro do app.
// Os itens abaixo são apenas necessários para carregamento de bibliotecas,
// diretórios temporários e localização de DLLs nas plataformas suportadas.
export function ambienteMultimidia(extras: Record<string, string>): NodeJS.ProcessEnv {
  const permitidas = new Set(['path', 'systemroot', 'windir', 'home', 'userprofile', 'temp', 'tmp', 'tmpdir', 'ld_library_path', 'lang', 'lc_all'])
  const base: NodeJS.ProcessEnv = {}
  for (const [chave, valor] of Object.entries(process.env)) {
    if (valor !== undefined && permitidas.has(chave.toLowerCase())) base[chave] = valor
  }
  return { ...base, ...extras }
}
