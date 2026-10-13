import { db } from './database'
import { clearAll } from './backup'
import type { Activity, Label, Method, MethodRun, Post, PostTemplate, Project, Routine, RoutineLog, Task } from './types'
import { addDays, parseISODate, todayISO } from '../lib/dates'
import { entityKey, uid } from '../lib/ids'
import { isScheduled } from '../lib/recurrence'

/**
 * Dados de exemplo, genéricos, para explorar o sistema.
 * Carregados apenas por ação explícita do usuário e removíveis em Configurações.
 */
export async function loadExampleData(today = todayISO()): Promise<void> {
  await clearAll()

  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const at = (iso: string, h = 9, m = 0) => {
    const d = parseISODate(iso)
    d.setHours(h, m, 0, 0)
    return d.getTime()
  }
  const now = Date.now()
  const activity: Activity[] = []
  const log = (type: Activity['entityType'], id: string, number: number, title: string, action: string, message: string, ts: number) =>
    activity.push({ id: uid(), at: ts, day: new Date(ts).toISOString().slice(0, 10), entityType: type, entityId: id, entityKey: entityKey(type, number), entityTitle: title, action, message })

  /* etiquetas e projetos */
  const labels: Label[] = [
    { id: uid(), name: 'planejamento', color: '#6366F1' },
    { id: uid(), name: 'financeiro', color: '#16A34A' },
    { id: uid(), name: 'pesquisa', color: '#0EA5E9' },
    { id: uid(), name: 'bloqueado', color: '#F43F5E' },
    { id: uid(), name: 'rápido', color: '#CA8A04' },
  ]
  const L = (name: string) => labels.find((l) => l.name === name)!.id

  const projects: Project[] = [
    { id: uid(), number: 1, name: 'Reorganizar o escritório', description: 'Espaço, arquivos físicos e equipamentos.', status: 'active', color: '#14B8A6', dueDate: addDays(today, 18), createdAt: at(addDays(today, -40)), updatedAt: now },
    { id: uid(), number: 2, name: 'Planejamento do trimestre', description: 'Metas, orçamento e calendário dos próximos três meses.', status: 'active', color: '#6366F1', dueDate: addDays(today, 9), createdAt: at(addDays(today, -21)), updatedAt: now },
    { id: uid(), number: 3, name: 'Curso de análise de dados', description: 'Módulos semanais e exercícios práticos.', status: 'paused', color: '#F97316', dueDate: null, createdAt: at(addDays(today, -60)), updatedAt: now },
  ]
  for (const p of projects) log('project', p.id, p.number, p.name, 'created', 'criou o projeto', p.createdAt)

  /* tarefas */
  const T = (n: number, title: string, status: Task['status'], priority: Task['priority'], opts: Partial<Task> = {}): Task => {
    const created = at(addDays(today, -Math.round(4 + rand() * 30)), 8 + Math.round(rand() * 8))
    const t: Task = {
      id: uid(), number: n, title, notes: '', status, priority, labels: [], projectId: null, dueDate: null, subtasks: [],
      createdAt: created, updatedAt: created, completedAt: null, ...opts,
    }
    log('task', t.id, n, title, 'created', 'criou a tarefa', created)
    return t
  }
  const tasks: Task[] = [
    T(1, 'Revisar orçamento mensal', 'doing', 'high', { labels: [L('financeiro')], projectId: projects[1].id, dueDate: today, notes: 'Comparar gastos fixos com o mês anterior e separar o que pode ser renegociado.', subtasks: [{ id: uid(), title: 'Exportar extratos', done: true }, { id: uid(), title: 'Classificar despesas', done: true }, { id: uid(), title: 'Definir limites por categoria', done: false }] }),
    T(2, 'Definir metas do trimestre', 'todo', 'urgent', { labels: [L('planejamento')], projectId: projects[1].id, dueDate: addDays(today, 2), subtasks: [{ id: uid(), title: 'Listar resultados do último trimestre', done: false }, { id: uid(), title: 'Escolher três prioridades', done: false }] }),
    T(3, 'Organizar arquivos digitais por ano', 'todo', 'medium', { labels: [L('planejamento')], projectId: projects[0].id, dueDate: addDays(today, 6) }),
    T(4, 'Pedir orçamento de estante', 'review', 'low', { projectId: projects[0].id, labels: [L('rápido')] }),
    T(5, 'Renovar assinatura do armazenamento em nuvem', 'todo', 'high', { labels: [L('financeiro'), L('rápido')], dueDate: addDays(today, -1) }),
    T(6, 'Pesquisar ferramentas de anotação', 'backlog', 'none', { labels: [L('pesquisa')] }),
    T(7, 'Montar calendário de revisões semanais', 'backlog', 'medium', { labels: [L('planejamento')], projectId: projects[1].id }),
    T(8, 'Concluir módulo 3 do curso', 'todo', 'medium', { projectId: projects[2].id, labels: [L('bloqueado')], notes: 'Aguardando liberação do material complementar.' }),
    T(9, 'Descartar papéis antigos', 'done', 'low', { projectId: projects[0].id, completedAt: at(addDays(today, -2), 17) }),
    T(10, 'Atualizar planilha de contas', 'done', 'medium', { labels: [L('financeiro')], completedAt: at(addDays(today, -1), 11) }),
    T(11, 'Instalar suporte do monitor', 'done', 'low', { projectId: projects[0].id, completedAt: at(today, 10) }),
  ]
  // tarefas concluídas ao longo das últimas semanas, para o histórico
  let n = 12
  for (let d = 90; d > 3; d -= 1 + Math.floor(rand() * 4)) {
    const day = addDays(today, -d)
    const t = T(n++, ['Responder pendências da semana', 'Arquivar documentos', 'Revisar lista de compras', 'Conferir agenda', 'Atualizar anotações'][Math.floor(rand() * 5)], 'done', 'low', { completedAt: at(day, 16), createdAt: at(addDays(day, -2)) })
    tasks.push(t)
  }
  for (const t of tasks) {
    t.updatedAt = Math.max(t.updatedAt, t.completedAt ?? 0)
    if (t.completedAt) log('task', t.id, t.number, t.title, 'completed', 'concluiu a tarefa', t.completedAt)
  }
  log('task', tasks[0].id, 1, tasks[0].title, 'status', 'moveu de A fazer para Em andamento', at(today, 8, 40))
  log('task', tasks[3].id, 4, tasks[3].title, 'status', 'moveu de Em andamento para Em revisão', at(addDays(today, -1), 15))

  /* rotinas */
  const R = (number: number, name: string, freq: Routine['frequency'], time: string | null, steps: string[], startOffset: number, priority: Routine['priority'], description = ''): Routine => ({
    id: uid(), number, name, description, frequency: freq, time, priority,
    steps: steps.map((title) => ({ id: uid(), title })), startDate: addDays(today, -startOffset), archived: false,
    createdAt: at(addDays(today, -startOffset)), updatedAt: at(addDays(today, -startOffset)),
  })
  const routines: Routine[] = [
    R(1, 'Planejamento do dia', { kind: 'daily' }, '08:00', ['Revisar agenda', 'Escolher as 3 prioridades', 'Bloquear horário de foco'], 120, 'high', 'Dez minutos para começar o dia com clareza.'),
    R(2, 'Exercício físico', { kind: 'weekly', days: [1, 3, 5] }, '07:00', ['Aquecimento', 'Treino principal', 'Alongamento'], 100, 'medium'),
    R(3, 'Revisão semanal', { kind: 'weekly', days: [5] }, '17:30', ['Fechar tarefas da semana', 'Atualizar projetos', 'Planejar a próxima semana'], 120, 'high'),
    R(4, 'Leitura', { kind: 'daily' }, '21:30', [], 70, 'low', '20 páginas por dia.'),
    R(5, 'Backup dos arquivos', { kind: 'interval', every: 7 }, null, ['Copiar pasta de trabalho', 'Verificar integridade'], 84, 'medium'),
  ]
  for (const r of routines) log('routine', r.id, r.number, r.name, 'created', 'criou a rotina', r.createdAt)
  const logs: RoutineLog[] = []
  const chance = [0.86, 0.78, 0.9, 0.7, 0.92]
  routines.forEach((r, i) => {
    for (let d = r.startDate; d < today; d = addDays(d, 1)) {
      if (!isScheduled(r, d)) continue
      // consistência melhora nas semanas recentes
      const recency = 1 - Math.min(1, (parseISODate(today).getTime() - parseISODate(d).getTime()) / (86_400_000 * 120)) * 0.3
      if (rand() < chance[i] * recency) {
        const completedAt = at(d, Number((r.time ?? '12:00').slice(0, 2)), 20)
        logs.push({ id: uid(), routineId: r.id, date: d, steps: (r.steps.length ? r.steps : [{ id: 'execucao', title: 'Execução' }]).map((s) => ({ id: s.id, title: s.title, done: true })), status: 'done', note: '', completedAt, updatedAt: completedAt })
        if (d >= addDays(today, -6)) log('routine', r.id, r.number, r.name, 'completed', 'concluiu a execução', completedAt)
      }
    }
  })
  // hoje: planejamento concluído, exercício parcial
  logs.push({ id: uid(), routineId: routines[0].id, date: today, steps: routines[0].steps.map((s) => ({ id: s.id, title: s.title, done: true })), status: 'done', note: '', completedAt: at(today, 8, 12), updatedAt: at(today, 8, 12) })
  log('routine', routines[0].id, 1, routines[0].name, 'completed', 'concluiu a execução hoje', at(today, 8, 12))
  if (isScheduled(routines[1], today)) {
    logs.push({ id: uid(), routineId: routines[1].id, date: today, steps: routines[1].steps.map((s, i) => ({ id: s.id, title: s.title, done: i === 0 })), status: 'partial', note: '', completedAt: null, updatedAt: at(today, 7, 15) })
  }

  /* métodos */
  const M = (number: number, title: string, category: string, summary: string, documentation: string, steps: [string, string, string[]][], version = 1): Method => ({
    id: uid(), number, title, category, summary, documentation, version, archived: false, duplicatedFrom: null,
    steps: steps.map(([t, d, items]) => ({ id: uid(), title: t, description: d, checklist: items.map((text) => ({ id: uid(), text })) })),
    createdAt: at(addDays(today, -50)), updatedAt: at(addDays(today, -12)),
  })
  const methods: Method[] = [
    M(1, 'Fechamento financeiro mensal', 'Finanças', 'Procedimento para conferir contas, registrar gastos e planejar o mês seguinte.',
      '## Quando usar\nNo primeiro dia útil de cada mês.\n\n## Resultado esperado\n- Planilha atualizada\n- Contas do mês seguinte agendadas\n\n> Guarde os comprovantes na pasta do ano corrente.',
      [['Coleta', 'Reunir extratos e comprovantes.', ['Baixar extratos bancários', 'Reunir notas fiscais', 'Conferir faturas do cartão']], ['Registro', 'Lançar os valores na planilha.', ['Lançar receitas', 'Lançar despesas por categoria', 'Conferir saldo final']], ['Planejamento', 'Preparar o mês seguinte.', ['Agendar contas fixas', 'Definir limite de gastos variáveis']]], 3),
    M(2, 'Onboarding de novo projeto', 'Projetos', 'Checklist para iniciar qualquer projeto com escopo, prazos e responsáveis claros.',
      '## Objetivo\nEvitar retrabalho no início dos projetos.\n\n## Etapas\n1. Entender o problema\n2. Definir escopo\n3. Montar o cronograma',
      [['Descoberta', 'Entender contexto e objetivo.', ['Registrar o problema em uma frase', 'Listar partes interessadas']], ['Escopo', 'O que entra e o que fica fora.', ['Definir entregáveis', 'Registrar o que está fora do escopo', 'Validar escopo']], ['Cronograma', 'Marcos e prazos.', ['Definir marcos', 'Criar tarefas no Nexo']]], 2),
    M(3, 'Revisão de documento', 'Qualidade', 'Leitura em três passadas: estrutura, conteúdo e forma.', '',
      [['Estrutura', '', ['Títulos fazem sentido', 'Ordem lógica das seções']], ['Conteúdo', '', ['Dados conferidos', 'Fontes citadas']], ['Forma', '', ['Ortografia', 'Formatação consistente']]]),
  ]
  for (const m of methods) {
    log('method', m.id, m.number, m.title, 'created', 'criou o método (v1)', m.createdAt)
    if (m.version > 1) log('method', m.id, m.number, m.title, 'version', `publicou a versão v${m.version}`, m.updatedAt)
  }
  const runs: MethodRun[] = []
  const mkRun = (num: number, m: Method, startedDay: string, status: MethodRun['status'], doneRatio: number, version = m.version): MethodRun => {
    const startedAt = at(startedDay, 10)
    const r: MethodRun = {
      id: uid(), number: num, methodId: m.id, methodTitle: m.title, methodVersion: version, title: `${m.title} · ${new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(parseISODate(startedDay)).replace('.', '')}`,
      steps: m.steps.map((s) => ({ id: s.id, title: s.title, description: s.description, checklist: s.checklist.map((c) => ({ id: c.id, text: c.text, done: rand() < doneRatio })) })),
      status, notes: '', startedAt, completedAt: status === 'completed' ? at(startedDay, 16) : null, updatedAt: startedAt,
    }
    log('run', r.id, num, r.title, 'started', `iniciou a execução a partir de ${entityKey('method', m.number)} v${version}`, startedAt)
    if (r.completedAt) log('run', r.id, num, r.title, 'completed', 'concluiu a execução', r.completedAt)
    return r
  }
  runs.push(mkRun(1, methods[0], addDays(today, -73), 'completed', 1, 1))
  runs.push(mkRun(2, methods[0], addDays(today, -43), 'completed', 1, 2))
  runs.push(mkRun(3, methods[1], addDays(today, -20), 'completed', 1, 1))
  runs.push(mkRun(4, methods[0], addDays(today, -12), 'completed', 1))
  runs.push(mkRun(5, methods[1], addDays(today, -3), 'active', 0.55))
  for (const r of runs) if (r.status === 'completed') r.steps.forEach((s) => s.checklist.forEach((c) => (c.done = true)))

  /* modelos e publicações */
  const stage = (title: string, description = '') => ({ id: uid(), title, description })
  const templates: PostTemplate[] = [
    { id: uid(), number: 1, name: 'Artigo informativo', description: 'Texto de profundidade média sobre um tema único.', objective: 'Explicar um assunto de forma clara e gerar interesse.', platforms: ['Blog', 'Newsletter'],
      stages: [stage('Pauta', 'Tema, público e ângulo'), stage('Pesquisa', 'Fontes e dados'), stage('Rascunho'), stage('Revisão'), stage('Imagem de capa'), stage('Agendamento')],
      body: '# {{título}}\n\nIntrodução: por que este tema importa agora.\n\n## Ponto principal\n\n## Exemplo prático\n\n## Conclusão e próximo passo', archived: false, createdAt: at(addDays(today, -45)), updatedAt: at(addDays(today, -10)) },
    { id: uid(), number: 2, name: 'Post curto com imagem', description: 'Mensagem direta com uma imagem de apoio.', objective: 'Manter presença e conversar com o público.', platforms: ['Rede social'],
      stages: [stage('Ideia'), stage('Texto'), stage('Imagem'), stage('Revisão rápida')], body: 'Gancho em uma linha.\n\nMensagem principal.\n\nChamada para ação.', archived: false, createdAt: at(addDays(today, -30)), updatedAt: at(addDays(today, -30)) },
    { id: uid(), number: 3, name: 'Vídeo tutorial', description: 'Passo a passo gravado.', objective: 'Ensinar uma tarefa do início ao fim.', platforms: ['Plataforma de vídeo'],
      stages: [stage('Roteiro'), stage('Gravação'), stage('Edição'), stage('Miniatura'), stage('Descrição'), stage('Upload')], body: 'Roteiro:\n1. Abertura (o que será ensinado)\n2. Passo a passo\n3. Encerramento', archived: false, createdAt: at(addDays(today, -25)), updatedAt: at(addDays(today, -25)) },
  ]
  for (const t of templates) log('template', t.id, t.number, t.name, 'created', 'criou o modelo de postagem', t.createdAt)
  const P = (number: number, title: string, tpl: PostTemplate, status: Post['status'], scheduledOffset: number | null, doneStages: number): Post => {
    const created = at(addDays(today, -Math.round(3 + rand() * 20)))
    const published = status === 'published' ? at(addDays(today, scheduledOffset ?? -1), 11) : null
    const p: Post = {
      id: uid(), number, title, templateId: tpl.id, objective: tpl.objective, platforms: [...tpl.platforms], status,
      scheduledDate: scheduledOffset === null ? null : addDays(today, scheduledOffset), scheduledTime: scheduledOffset === null ? null : '10:00',
      publishedAt: published, body: tpl.body.replace('{{título}}', title), notes: '',
      stages: tpl.stages.map((s, i) => ({ ...s, done: i < doneStages })), links: [], createdAt: created, updatedAt: published ?? created,
    }
    log('post', p.id, number, title, 'created', `criou a partir do modelo ${entityKey('template', tpl.number)} · ${tpl.name}`, created)
    if (published) log('post', p.id, number, title, 'published', 'registrou a publicação como concluída', published)
    return p
  }
  const posts: Post[] = [
    P(1, 'Como organizar a semana em 20 minutos', templates[0], 'production', 4, 3),
    P(2, 'Checklist de fim de mês', templates[1], 'scheduled', 1, 4),
    P(3, 'Tutorial: quadro Kanban pessoal', templates[2], 'review', 8, 4),
    P(4, 'Três hábitos para manter o foco', templates[1], 'idea', null, 0),
    P(5, 'Erros comuns no planejamento', templates[0], 'idea', 12, 1),
    P(6, 'Guia rápido de revisão semanal', templates[0], 'published', -6, 6),
    P(7, 'Antes e depois da organização', templates[1], 'published', -13, 4),
    P(8, 'Planejamento trimestral na prática', templates[2], 'published', -27, 6),
  ]

  await db.transaction('rw', db.tables, async () => {
    await db.labels.bulkAdd(labels)
    await db.projects.bulkAdd(projects)
    await db.tasks.bulkAdd(tasks)
    await db.routines.bulkAdd(routines)
    await db.routineLogs.bulkAdd(logs)
    await db.methods.bulkAdd(methods)
    await db.methodRuns.bulkAdd(runs)
    await db.templates.bulkAdd(templates)
    await db.posts.bulkAdd(posts)
    await db.activity.bulkAdd(activity.map((a) => ({ ...a, day: todayISO(new Date(a.at)) })))
    await db.counters.bulkPut([
      { name: 'task', value: tasks.length },
      { name: 'project', value: projects.length },
      { name: 'routine', value: routines.length },
      { name: 'method', value: methods.length },
      { name: 'run', value: runs.length },
      { name: 'template', value: templates.length },
      { name: 'post', value: posts.length },
    ])
  })
}
