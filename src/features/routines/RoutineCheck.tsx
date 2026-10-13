import { Link } from 'react-router-dom'
import { Check, Clock } from 'lucide-react'
import type { ISODate, Routine, RoutineLog } from '../../db/types'
import { entityKey } from '../../lib/ids'
import { setRoutineDone, toggleRoutineStep } from '../../db/routines'
import { PriorityIcon } from '../../components/icons'
import { Checkbox, cx } from '../../components/ui'

/** Cartão de execução do dia: concluir de uma vez ou etapa por etapa. */
export function RoutineCheck({ routine, log, date, compact }: { routine: Routine; log?: RoutineLog; date: ISODate; compact?: boolean }) {
  const done = log?.status === 'done'
  // etapas atuais da rotina, com o estado salvo na execução do dia
  const steps = done && log ? log.steps : routine.steps.map((s) => ({ ...s, done: log?.steps.find((x) => x.id === s.id)?.done ?? false }))
  const doneCount = steps.filter((s) => s.done).length

  return (
    <article className={cx('rcheck', done && 'is-done', compact && 'rcheck--compact')}>
      <button
        type="button"
        className="rcheck__toggle"
        aria-pressed={done}
        aria-label={done ? `Desfazer conclusão de ${routine.name}` : `Concluir ${routine.name}`}
        onClick={() => setRoutineDone(routine.id, date, !done)}
      >
        <Check size={15} strokeWidth={2.6} aria-hidden />
      </button>
      <div className="rcheck__body">
        <header className="rcheck__head">
          <Link to={`/rotinas/${routine.number}`} className="rcheck__name">
            {routine.name}
          </Link>
          <span className="rcheck__meta">
            {routine.time && (
              <span className="mono">
                <Clock size={12} aria-hidden /> {routine.time}
              </span>
            )}
            {!compact && <span className="ref mono">{entityKey('routine', routine.number)}</span>}
            <PriorityIcon priority={routine.priority} size={14} title />
          </span>
        </header>
        {steps.length > 0 && !compact && (
          <ul className="rcheck__steps">
            {steps.map((s) => (
              <li key={s.id}>
                <Checkbox checked={s.done} onChange={() => toggleRoutineStep(routine.id, date, s.id)} label={s.title} />
              </li>
            ))}
          </ul>
        )}
        {steps.length > 0 && compact && (
          <p className="rcheck__progress mono">
            {doneCount}/{steps.length} etapas
          </p>
        )}
      </div>
    </article>
  )
}
