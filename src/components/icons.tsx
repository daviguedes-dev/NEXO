import type { Priority, TaskStatus } from '../db/types'
import { priorityLabel, taskStatusLabel } from '../lib/meta'

/** Ícone de status desenhado à mão: o preenchimento indica o avanço. */
export function StatusIcon({ status, size = 16, title }: { status: TaskStatus; size?: number; title?: boolean }) {
  const color = `var(--st-${status})`
  const label = taskStatusLabel(status)
  return (
    <svg className="status-icon" width={size} height={size} viewBox="0 0 16 16" role={title ? 'img' : undefined} aria-label={title ? label : undefined} aria-hidden={title ? undefined : true}>
      {status === 'backlog' && <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2.2 2.1" />}
      {status === 'todo' && <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.6" />}
      {status === 'doing' && (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M8 4.2a3.8 3.8 0 0 1 0 7.6z" fill={color} />
        </>
      )}
      {status === 'review' && (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M8 4.2a3.8 3.8 0 1 1-3.8 3.8H8z" fill={color} />
        </>
      )}
      {status === 'done' && (
        <>
          <circle cx="8" cy="8" r="7" fill={color} />
          <path d="M5 8.2l2 2 4-4.3" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

/** Barras de sinal para prioridade; urgente ganha um marcador sólido. */
export function PriorityIcon({ priority, size = 16, title }: { priority: Priority; size?: number; title?: boolean }) {
  const label = priorityLabel(priority)
  const common = { className: 'priority-icon', width: size, height: size, viewBox: '0 0 16 16', role: title ? 'img' : undefined, 'aria-label': title ? label : undefined, 'aria-hidden': title ? undefined : true }
  if (priority === 'urgent')
    return (
      <svg {...common}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="var(--pr-urgent)" />
        <path d="M8 4.5v4.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.3" r="1.05" fill="#fff" />
      </svg>
    )
  if (priority === 'none')
    return (
      <svg {...common}>
        {[2.5, 6.8, 11.1].map((x) => (
          <rect key={x} x={x} y="7.2" width="2.6" height="1.6" rx=".8" fill="var(--ink-4)" />
        ))}
      </svg>
    )
  const level = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1
  const color = `var(--pr-${priority})`
  return (
    <svg {...common}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={2 + i * 4.4} y={10 - i * 3.3} width="3" height={4 + i * 3.3} rx="1" fill={i < level ? color : 'var(--line-strong)'} />
      ))}
    </svg>
  )
}

/** Marca do Nexo: dois ramos que se unem (rastreabilidade). */
export function NexoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="nexo-mark">
      <rect width="32" height="32" rx="8" fill="#14B8A6" fillOpacity=".12" />
      <g fill="none" stroke="#14B8A6" strokeWidth="2.4" strokeLinecap="round">
        <path d="M10 8.5v15" />
        <path d="M10 21.5c0-5 12-3.5 12-9.5" />
      </g>
      <g fill="#0B1220" stroke="#14B8A6" strokeWidth="2.2">
        <circle cx="10" cy="8.5" r="2.5" />
        <circle cx="10" cy="23.5" r="2.5" />
        <circle cx="22" cy="11" r="2.5" />
      </g>
    </svg>
  )
}
