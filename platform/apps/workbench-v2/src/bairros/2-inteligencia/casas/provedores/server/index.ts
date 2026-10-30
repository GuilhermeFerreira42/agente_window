// Porta pública exclusivamente server-side da Casa Provedores.
// Consumidores de outras casas usam este barrel estreito, nunca providersRepo
// ou descritores internos. Não importar este arquivo em módulos de browser.
export { descritorPorId, iniciarChamadaModelo, lerArquivo, resolverChave } from './providersRepo'
