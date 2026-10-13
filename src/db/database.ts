import Dexie, { type EntityTable } from 'dexie'
import type {
  Activity,
  Counter,
  Label,
  Method,
  MethodRun,
  Post,
  PostTemplate,
  Project,
  Routine,
  RoutineLog,
  Task,
} from './types'

export class NexoDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  labels!: EntityTable<Label, 'id'>
  projects!: EntityTable<Project, 'id'>
  routines!: EntityTable<Routine, 'id'>
  routineLogs!: EntityTable<RoutineLog, 'id'>
  methods!: EntityTable<Method, 'id'>
  methodRuns!: EntityTable<MethodRun, 'id'>
  templates!: EntityTable<PostTemplate, 'id'>
  posts!: EntityTable<Post, 'id'>
  activity!: EntityTable<Activity, 'id'>
  counters!: EntityTable<Counter, 'name'>

  constructor(name = 'nexo') {
    super(name)
    this.version(1).stores({
      tasks: 'id, &number, status, priority, projectId, dueDate, updatedAt, *labels',
      labels: 'id, name',
      projects: 'id, &number, status',
      routines: 'id, &number',
      routineLogs: 'id, routineId, date, &[routineId+date]',
      methods: 'id, &number',
      methodRuns: 'id, &number, methodId, status',
      templates: 'id, &number',
      posts: 'id, &number, status, scheduledDate, templateId',
      activity: 'id, at, day, entityId',
      counters: 'name',
    })
  }
}

export const db = new NexoDB()

/** Todas as tabelas, na ordem usada por backup/restauração. */
export const TABLES = [
  'tasks',
  'labels',
  'projects',
  'routines',
  'routineLogs',
  'methods',
  'methodRuns',
  'templates',
  'posts',
  'activity',
  'counters',
] as const

export type TableName = (typeof TABLES)[number]
