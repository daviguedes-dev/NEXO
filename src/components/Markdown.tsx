import { Fragment, type ReactNode } from 'react'

/**
 * Renderizador de Markdown mínimo e seguro (sem HTML bruto):
 * títulos (#, ##, ###), listas, citações, parágrafos, **negrito**, *itálico*, `código` e [links](https://…).
 */
export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const content = inline(h[2])
      blocks.push(level === 1 ? <h3 key={key++}>{content}</h3> : level === 2 ? <h4 key={key++}>{content}</h4> : <h5 key={key++}>{content}</h5>)
      i++
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-*]\s+/, '')
        const task = text.match(/^\[( |x)\]\s+(.*)$/i)
        items.push(
          <li key={i} className={task ? 'md-task' : undefined}>
            {task && <span className={`md-box${task[1].toLowerCase() === 'x' ? ' is-done' : ''}`} aria-hidden />}
            {inline(task ? task[2] : text)}
          </li>,
        )
        i++
      }
      blocks.push(<ul key={key++}>{items}</ul>)
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>)
        i++
      }
      blocks.push(<ol key={key++}>{items}</ol>)
      continue
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push(<blockquote key={key++}>{inline(quote.join(' '))}</blockquote>)
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*[-*]\s|\s*\d+[.)]\s|>)/.test(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push(<p key={key++}>{inline(para.join(' '))}</p>)
  }
  return <div className="md">{blocks}</div>
}

function inline(text: string): ReactNode {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k++}>{t.slice(1, -1)}</code>)
    else if (t.startsWith('[')) {
      const lm = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      const href = lm?.[2] ?? ''
      out.push(
        /^https?:\/\//i.test(href) ? (
          <a key={k++} href={href} target="_blank" rel="noopener noreferrer">
            {lm?.[1]}
          </a>
        ) : (
          <Fragment key={k++}>{lm?.[1]}</Fragment>
        ),
      )
    } else out.push(<em key={k++}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
