import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './database'
import type { Activity, ID, Label, Method, MethodRun, Post, PostTemplate, Project, Routine, RoutineLog, Task } from './types'

const EMPTY: never[] = []

export const useTasks = (): Task[] | undefined => useLiveQuery(() => db.tasks.toArray(), [])
export const useLabels = (): Label[] => useLiveQuery(() => db.labels.orderBy('name').toArray(), []) ?? EMPTY
export const useProjects = (): Project[] => useLiveQuery(() => db.projects.orderBy('number').toArray(), []) ?? EMPTY
export const useRoutines = (): Routine[] | undefined => useLiveQuery(() => db.routines.orderBy('number').toArray(), [])
export const useRoutineLogs = (): RoutineLog[] | undefined => useLiveQuery(() => db.routineLogs.toArray(), [])
export const useMethods = (): Method[] | undefined => useLiveQuery(() => db.methods.orderBy('number').toArray(), [])
export const useRuns = (): MethodRun[] | undefined => useLiveQuery(() => db.methodRuns.orderBy('number').reverse().toArray(), [])
export const useTemplates = (): PostTemplate[] | undefined => useLiveQuery(() => db.templates.orderBy('number').toArray(), [])
export const usePosts = (): Post[] | undefined => useLiveQuery(() => db.posts.toArray(), [])

export const useRecentActivity = (limit = 12): Activity[] | undefined =>
  useLiveQuery(() => db.activity.orderBy('at').reverse().limit(limit).toArray(), [limit])

export const useEntityActivity = (entityId: ID | undefined): Activity[] =>
  useLiveQuery(
    async () => (entityId ? (await db.activity.where('entityId').equals(entityId).sortBy('at')).reverse() : []),
    [entityId],
  ) ?? EMPTY
