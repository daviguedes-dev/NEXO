import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './database'
import { clearAll, exportAll, parseBackup, restoreAll } from './backup'
import { createMethod, duplicateMethod, startRun, toggleRunItem, updateMethod } from './methods'
import { createPostFromTemplate, createTemplate, updatePost, updateTemplate } from './posts'
import { createRoutine, setRoutineDone, toggleRoutineStep, updateRoutine } from './routines'
import { createTask, updateTask } from './tasks'

beforeEach(async () => {
  await clearAll()
})

describe('tarefas', () => {
  it('numera em sequência e registra mudanças importantes no histórico', async () => {
    const a = await createTask({ title: 'Primeira' })
    const b = await createTask({ title: 'Segunda', status: 'backlog' })
    expect([a.number, b.number]).toEqual([1, 2])

    await updateTask(a.id, { status: 'done', priority: 'high', dueDate: '2026-10-20' })
    const t = await db.tasks.get(a.id)
    expect(t?.completedAt).toBeTypeOf('number')

    const history = await db.activity.where('entityId').equals(a.id).toArray()
    expect(history.map((h) => h.action).sort()).toEqual(['completed', 'created', 'due', 'priority'])
    expect(history.every((h) => h.entityKey === 'TSK-1')).toBe(true)

    await updateTask(a.id, { status: 'todo' })
    expect((await db.tasks.get(a.id))?.completedAt).toBeNull()
  })
})

describe('rotinas', () => {
  it('editar a rotina não altera execuções passadas', async () => {
    const r = await createRoutine({ name: 'Manhã', steps: [{ id: 's1', title: 'Água' }, { id: 's2', title: 'Alongar' }] })
    await toggleRoutineStep(r.id, '2026-10-10', 's1')
    let log = await db.routineLogs.where('[routineId+date]').equals([r.id, '2026-10-10']).first()
    expect(log?.status).toBe('partial')
    await toggleRoutineStep(r.id, '2026-10-10', 's2')
    log = await db.routineLogs.get(log!.id)
    expect(log?.status).toBe('done')

    await updateRoutine(r.id, { steps: [{ id: 's3', title: 'Meditar' }] })
    log = await db.routineLogs.get(log!.id)
    expect(log?.steps.map((s) => s.title)).toEqual(['Água', 'Alongar'])
  })

  it('rotina sem etapas é concluída e desfeita por inteiro', async () => {
    const r = await createRoutine({ name: 'Leitura' })
    await setRoutineDone(r.id, '2026-10-11', true)
    expect(await db.routineLogs.count()).toBe(1)
    await setRoutineDone(r.id, '2026-10-11', false)
    expect(await db.routineLogs.count()).toBe(0)
  })
})

describe('métodos', () => {
  it('execução é uma cópia independente da versão de origem', async () => {
    const m = await createMethod({ title: 'Fechamento', steps: [{ id: 'e1', title: 'Coleta', description: '', checklist: [{ id: 'c1', text: 'Extratos' }] }] })
    const run = await startRun(m.id)
    expect(run?.methodVersion).toBe(1)

    await updateMethod(m.id, { steps: [{ id: 'e1', title: 'Coleta revisada', description: '', checklist: [] }] })
    expect((await db.methods.get(m.id))?.version).toBe(2)

    await toggleRunItem(run!.id, 'e1', 'c1')
    const saved = await db.methodRuns.get(run!.id)
    expect(saved?.steps[0].title).toBe('Coleta')
    expect(saved?.steps[0].checklist[0].done).toBe(true)
  })

  it('duplicar cria um método novo com IDs próprios', async () => {
    const m = await createMethod({ title: 'Base', steps: [{ id: 'e1', title: 'A', description: '', checklist: [{ id: 'c1', text: 'x' }] }] })
    const copy = await duplicateMethod(m.id)
    expect(copy?.title).toBe('Base (cópia)')
    expect(copy?.duplicatedFrom).toBe(m.id)
    expect(copy?.steps[0].id).not.toBe('e1')
  })
})

describe('publicações', () => {
  it('copia o modelo e registra a conclusão com data', async () => {
    const t = await createTemplate({ name: 'Artigo', platforms: ['Blog'], stages: [{ id: 'p1', title: 'Pauta', description: '' }] })
    const post = await createPostFromTemplate(t.id, { title: 'Meu artigo' })
    await updateTemplate(t.id, { platforms: ['Outra'] })
    expect((await db.posts.get(post!.id))?.platforms).toEqual(['Blog'])

    await updatePost(post!.id, { status: 'published' })
    expect((await db.posts.get(post!.id))?.publishedAt).toBeTypeOf('number')
    const actions = (await db.activity.where('entityId').equals(post!.id).toArray()).map((a) => a.action)
    expect(actions).toContain('published')
  })
})

describe('backup', () => {
  it('exporta e restaura todos os dados', async () => {
    await createTask({ title: 'Guardar' })
    const file = await exportAll()
    const text = JSON.stringify(file)
    await clearAll()
    expect(await db.tasks.count()).toBe(0)
    await restoreAll(parseBackup(text))
    expect((await db.tasks.toArray())[0].title).toBe('Guardar')
    expect(() => parseBackup('{"app":"outro"}')).toThrow()
  })
})
