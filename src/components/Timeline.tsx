import { Link } from 'react-router-dom'
import type { Activity, EntityType } from '../db/types'
import { formatDateTime, timeAgo } from '../lib/dates'
import { cx } from './ui'

export const ENTITY_LABEL: Record<EntityType, string> = {
  task: 'Tarefa',
  project: 'Projeto',
  routine: 'Rotina',
  method: 'Método',
  run: 'Execução',
  post: 'Publicação',
  template: 'Modelo',
}

/** Caminho da tela de cada registro, a partir da referência (TSK-12 → /tarefas/12). */
export function entityPath(a: Pick<Activity, 'entityType' | 'entityKey'>): string | null {
  const n = a.entityKey.split('-')[1]
  switch (a.entityType) {
    case 'task':
      return `/tarefas/${n}`
    case 'project':
      return `/projetos`
    case 'routine':
      return `/rotinas/${n}`
    case 'method':
      return `/metodos/${n}`
    case 'run':
      return `/metodos/execucoes/${n}`
    case 'post':
      return `/publicacoes/${n}`
    case 'template':
      return `/publicacoes/modelos/${n}`
  }
}

const TONE: Partial<Record<string, string>> = {
  completed: 'done',
  published: 'done',
  created: 'new',
  started: 'new',
  deleted: 'danger',
  canceled: 'danger',
  archived: 'muted',
}

interface Props {
  items: Activity[]
  /** Mostra a referência e o título de cada registro (feed geral). */
  showEntity?: boolean
  empty?: string
}

/** Linha do tempo no estilo de histórico de commits: cada nó é uma mudança registrada. */
export function Timeline({ items, showEntity, empty = 'Nenhuma alteração registrada ainda.' }: Props) {
  if (!items.length) return <p className="timeline__empty">{empty}</p>
  return (
    <ol className="timeline">
      {items.map((a) => {
        const path = showEntity ? entityPath(a) : null
        return (
          <li key={a.id} className={cx('timeline__item', `tone-${TONE[a.action] ?? 'default'}`)}>
            <span className="timeline__node" aria-hidden />
            <div className="timeline__content">
              {showEntity && (
                <p className="timeline__entity">
                  <span className="ref mono">{a.entityKey}</span>
                  {path && a.action !== 'deleted' ? (
                    <Link to={path} className="timeline__title">
                      {a.entityTitle}
                    </Link>
                  ) : (
                    <span className="timeline__title">{a.entityTitle}</span>
                  )}
                </p>
              )}
              <p className="timeline__msg">
                <span>{capitalize(a.message)}</span>
                <time className="timeline__time" dateTime={new Date(a.at).toISOString()} title={formatDateTime(a.at)}>
                  {timeAgo(a.at)}
                </time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
