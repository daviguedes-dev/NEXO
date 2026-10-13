import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, Database, ListChecks, Megaphone, Repeat2, Sparkles } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import { useProjects, usePosts, useRecentActivity, useRoutineLogs, useRoutines, useRuns, useTasks } from '../../db/hooks'
import { loadExampleData } from '../../db/seed'
import { addDays, formatLongDate, greeting, todayISO } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { priorityRank } from '../../lib/meta'
import { isScheduled } from '../../lib/recurrence'
import { contributionMap, currentDayStreak, longestDayStreak } from '../../lib/stats'
import { runProgress } from '../../db/methods'
import { ContributionGraph } from '../../components/ContributionGraph'
import { PriorityIcon } from '../../components/icons'
import { useConfirm, useToast } from '../../components/feedback'
import { Timeline } from '../../components/Timeline'
import { Button, LinkButton, PageHeader, Panel, ProgressBar, ProgressRing, cx } from '../../components/ui'
import { RoutineCheck } from '../routines/RoutineCheck'
import { DueDate, StatusMenu } from '../tasks/parts'

export function OverviewPage() {
  const tasks = useTasks()
  const routines = useRoutines()
  const logs = useRoutineLogs()
  const runs = useRuns()
  const posts = usePosts()
  const projects = useProjects()
  const [feedLimit, setFeedLimit] = useState(10)
  const activity = useRecentActivity(feedLimit)
  const activityTotal = useLiveQuery(() => db.activity.count(), []) ?? 0
  const today = todayISO()

  const ready = tasks && routines && logs && runs && posts
  const contributions = useMemo(
    () => (ready ? contributionMap({ tasks: tasks!, logs: logs!, runs: runs!, posts: posts! }) : new Map()),
    [ready, tasks, logs, runs, posts],
  )

  if (!ready) return null

  const empty = !tasks.length && !routines.length && !runs.length && !posts.length && !projects.length
  if (empty) return <Welcome />

  const open = tasks.filter((t) => t.status !== 'done')
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today)
  const dueToday = open.filter((t) => t.dueDate === today)
  const todayRoutines = routines.filter((r) => !r.archived && isScheduled(r, today)).sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
  const todayLogs = new Map(logs.filter((l) => l.date === today).map((l) => [l.routineId, l]))
  const routinesDone = todayRoutines.filter((r) => todayLogs.get(r.id)?.status === 'done').length
  const activeRuns = runs.filter((r) => r.status === 'active')
  const weekPosts = posts.filter((p) => p.status !== 'published' && p.scheduledDate && p.scheduledDate >= today && p.scheduledDate <= addDays(today, 7))
  const todayPosts = posts.filter((p) => p.status !== 'published' && p.scheduledDate === today)
  const priorities = [...open]
    .filter((t) => t.priority !== 'none' || (t.dueDate && t.dueDate <= addDays(today, 3)))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    .slice(0, 7)
  const activeProjects = projects.filter((p) => p.status === 'active')

  // ano de consistência
  const yearStart = addDays(today, -364)
  let yearTotal = 0
  const parts = { tasks: 0, routines: 0, runs: 0, posts: 0 }
  for (const [d, c] of contributions) {
    if (d < yearStart || d > today) continue
    yearTotal += c.total
    parts.tasks += c.tasks
    parts.routines += c.routines
    parts.runs += c.runs
    parts.posts += c.posts
  }
  const streak = currentDayStreak(contributions, today)
  const longest = longestDayStreak(contributions, yearStart, today)
  const doneToday = contributions.get(today)?.total ?? 0

  const summary = [
    todayRoutines.length ? `${routinesDone} de ${todayRoutines.length} rotinas concluídas` : null,
    dueToday.length ? `${dueToday.length} tarefa${dueToday.length > 1 ? 's' : ''} para hoje` : null,
    overdue.length ? `${overdue.length} atrasada${overdue.length > 1 ? 's' : ''}` : null,
    todayPosts.length ? `${todayPosts.length} publicação prevista` : null,
  ].filter(Boolean)

  return (
    <div className="page page--wide overview">
      <PageHeader
        section="visão geral"
        title={`${greeting()}.`}
        description={
          <>
            {capitalize(formatLongDate(today))}
            {summary.length ? ` — ${summary.join(' · ')}.` : '.'}
          </>
        }
      />

      <dl className="strip panel" aria-label="Resumo">
        <div className="strip__item">
          <dt>Tarefas abertas</dt>
          <dd className="mono">{open.length}</dd>
          <dd className="strip__more">
            <Link to="/tarefas?concluidas=0" className="strip__link">
              ver lista
            </Link>
          </dd>
        </div>
        <div className={cx('strip__item', overdue.length > 0 && 'is-alert')}>
          <dt>Atrasadas</dt>
          <dd className="mono">{overdue.length}</dd>
          <dd className="strip__more">
            <Link to="/tarefas?prazo=overdue" className="strip__link">
              revisar
            </Link>
          </dd>
        </div>
        <div className="strip__item">
          <dt>Rotinas hoje</dt>
          <dd className="mono">
            {routinesDone}
            <span className="muted">/{todayRoutines.length}</span>
          </dd>
          <dd className="strip__more">
            <Link to="/rotinas" className="strip__link">
              abrir
            </Link>
          </dd>
        </div>
        <div className="strip__item">
          <dt>Métodos em execução</dt>
          <dd className="mono">{activeRuns.length}</dd>
          <dd className="strip__more">
            <Link to="/metodos" className="strip__link">
              continuar
            </Link>
          </dd>
        </div>
        <div className="strip__item">
          <dt>Publicações em 7 dias</dt>
          <dd className="mono">{weekPosts.length}</dd>
          <dd className="strip__more">
            <Link to="/publicacoes?aba=calendario" className="strip__link">
              calendário
            </Link>
          </dd>
        </div>
      </dl>

      <div className="overview-grid">
        <Panel
          className="ov-today"
          title="Rotinas de hoje"
          actions={
            todayRoutines.length > 0 && (
              <ProgressRing value={routinesDone} total={todayRoutines.length} size={36}>
                <span className="mono">{Math.round((routinesDone / todayRoutines.length) * 100)}%</span>
              </ProgressRing>
            )
          }
        >
          {todayRoutines.length === 0 ? (
            <p className="muted">Nenhuma rotina prevista para hoje.</p>
          ) : (
            <div className="rcheck-list">
              {todayRoutines.map((r) => (
                <RoutineCheck key={r.id} routine={r} log={todayLogs.get(r.id)} date={today} compact />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          className="ov-priorities"
          title="Prioridades"
          count={priorities.length}
          actions={
            <LinkButton to="/tarefas" variant="ghost" size="sm">
              Todas as tarefas
            </LinkButton>
          }
        >
          {priorities.length === 0 ? (
            <p className="muted">Nada urgente. Defina prioridades nas tarefas para vê-las aqui.</p>
          ) : (
            <ul className="mini-tasks">
              {priorities.map((t) => (
                <li key={t.id}>
                  <StatusMenu task={t} />
                  <PriorityIcon priority={t.priority} title />
                  <Link to={`/tarefas/${t.number}`} className="mini-tasks__title">
                    {t.title}
                  </Link>
                  <span className="ref mono">{entityKey('task', t.number)}</span>
                  {t.dueDate && <DueDate date={t.dueDate} today={today} />}
                </li>
              ))}
            </ul>
          )}
          {activeRuns.length > 0 && (
            <div className="ov-runs">
              <p className="ov-sub">Métodos em execução</p>
              {activeRuns.slice(0, 3).map((r) => {
                const p = runProgress(r)
                return (
                  <Link key={r.id} to={`/metodos/execucoes/${r.number}`} className="ov-run">
                    <span className="ov-run__title">{r.title}</span>
                    <ProgressBar value={p.done} total={p.total} />
                    <span className="mono muted">
                      {p.done}/{p.total}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </Panel>

        <Panel
          className="ov-heat"
          title="Consistência"
          actions={<span className="muted small">tarefas concluídas, rotinas cumpridas, métodos finalizados e publicações</span>}
        >
          <ContributionGraph
            data={contributions}
            today={today}
            fit
            aside={
              <dl className="heat-facts">
                <div>
                  <dt>Entregas em 12 meses</dt>
                  <dd className="mono">{yearTotal}</dd>
                </div>
                <div>
                  <dt>Sequência atual</dt>
                  <dd className="mono">
                    {streak} <small>dia{streak === 1 ? '' : 's'}</small>
                  </dd>
                </div>
                <div>
                  <dt>Maior sequência</dt>
                  <dd className="mono">
                    {longest} <small>dia{longest === 1 ? '' : 's'}</small>
                  </dd>
                </div>
                <div>
                  <dt>Entregas hoje</dt>
                  <dd className="mono">{doneToday}</dd>
                </div>
              </dl>
            }
          />
          <ul className="heat-parts" aria-label="Entregas por módulo nos últimos 12 meses">
            <li>
              <ListChecks size={14} aria-hidden /> <span className="mono">{parts.tasks}</span> tarefas
            </li>
            <li>
              <Repeat2 size={14} aria-hidden /> <span className="mono">{parts.routines}</span> execuções de rotina
            </li>
            <li>
              <BookOpenCheck size={14} aria-hidden /> <span className="mono">{parts.runs}</span> métodos concluídos
            </li>
            <li>
              <Megaphone size={14} aria-hidden /> <span className="mono">{parts.posts}</span> publicações
            </li>
          </ul>
        </Panel>

        <Panel
          className="ov-projects"
          title="Projetos em andamento"
          count={activeProjects.length}
          actions={
            <LinkButton to="/projetos" variant="ghost" size="sm">
              Projetos
            </LinkButton>
          }
        >
          {activeProjects.length === 0 ? (
            <p className="muted">Nenhum projeto ativo.</p>
          ) : (
            <ul className="ov-project-list">
              {activeProjects.map((p) => {
                const list = tasks.filter((t) => t.projectId === p.id)
                const done = list.filter((t) => t.status === 'done').length
                return (
                  <li key={p.id}>
                    <Link to={`/tarefas?projeto=${p.id}`} className="ov-project">
                      <span className="ov-project__dot" style={{ background: p.color }} aria-hidden />
                      <span className="ov-project__name">{p.name}</span>
                      <span className="ov-project__bar">
                        <ProgressBar value={done} total={list.length} label={`${done} de ${list.length} tarefas`} />
                      </span>
                      <span className="mono muted">
                        {done}/{list.length}
                      </span>
                      {p.dueDate ? <DueDate date={p.dueDate} today={today} /> : <span />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel className="ov-activity" title="Atividade recente" count={activityTotal}>
          <Timeline items={activity ?? []} showEntity />
          {activityTotal > feedLimit && (
            <Button variant="ghost" size="sm" onClick={() => setFeedLimit((n) => n + 20)}>
              Mostrar mais
            </Button>
          )}
        </Panel>
      </div>
    </div>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Welcome() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const steps = [
    { to: '/tarefas?nova=1', icon: ListChecks, title: 'Registre uma tarefa', text: 'Com status, prioridade, etiquetas, prazo e subtarefas.' },
    { to: '/rotinas?nova=1', icon: Repeat2, title: 'Configure uma rotina', text: 'Diária, semanal ou a cada N dias, com horário e etapas.' },
    { to: '/metodos?novo=1', icon: BookOpenCheck, title: 'Documente um método', text: 'Um processo com checklist reutilizável e execuções separadas.' },
    { to: '/publicacoes?nova=1', icon: Megaphone, title: 'Planeje uma publicação', text: 'Modelos de postagem genéricos, Kanban e calendário.' },
  ]
  return (
    <div className="page welcome">
      <PageHeader
        section="início"
        title="Bem-vindo ao Nexo."
        description="Um lugar para rotinas, tarefas, métodos de trabalho e publicações — com histórico de tudo o que muda."
      />
      <ol className="welcome__steps">
        {steps.map((s, i) => (
          <li key={s.to}>
            <Link to={s.to} className="welcome__step panel">
              <span className="welcome__n mono">0{i + 1}</span>
              <s.icon size={20} strokeWidth={1.8} aria-hidden />
              <span className="welcome__title">{s.title}</span>
              <span className="welcome__text">{s.text}</span>
              <ArrowRight size={16} className="welcome__arrow" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
      <div className="welcome__alt panel">
        <Sparkles size={18} aria-hidden />
        <div>
          <p className="welcome__alt-title">Prefere explorar antes?</p>
          <p className="muted">Carregue um conjunto de dados de exemplo, genérico, para ver o sistema em uso. Você pode apagá-lo depois em Configurações.</p>
        </div>
        <Button
          icon={Database}
          onClick={async () => {
            if (
              !(await confirm({
                title: 'Carregar dados de exemplo?',
                message: 'Serão criados registros fictícios de tarefas, rotinas, métodos e publicações.',
                confirmLabel: 'Carregar exemplos',
              }))
            )
              return
            await loadExampleData()
            toast('Dados de exemplo carregados')
            navigate('/')
          }}
        >
          Carregar exemplos
        </Button>
      </div>
    </div>
  )
}
