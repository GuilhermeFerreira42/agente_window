import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Adaptador visual do Bairro 1; reutiliza o renderizador instalado, sem executar HTML. */
export function renderDocumentMarkdown(content: string) {
  return <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={{
    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    img: ({ alt }) => <span role="img" aria-label={alt ?? 'Imagem'}>{alt ?? 'Imagem'}</span>,
  }}>{content}</ReactMarkdown>;
}
