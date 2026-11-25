// PDF mínimo e sintético de uma página, com xref conferido, só para testes.
export function pdfDeTeste(texto: string): Buffer {
  if (!/^[\x20-\x7e]*$/u.test(texto) || /[()\\]/u.test(texto)) throw new Error('Fixture ASCII inválida')
  const conteudo = `BT /F1 18 Tf 60 700 Td (${texto}) Tj ET`
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(conteudo)} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let documento = '%PDF-1.4\n'
  const offsets = [0]
  objetos.forEach((objeto, i) => { offsets.push(Buffer.byteLength(documento)); documento += `${i + 1} 0 obj\n${objeto}\nendobj\n` })
  const xref = Buffer.byteLength(documento)
  documento += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  documento += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  documento += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(documento)
}
