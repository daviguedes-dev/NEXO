import { describe, expect, it } from 'vitest'
import { db, markRemote, selectDatabase } from './database'
import { clearAll } from './backup'
import { createTask, deleteTask } from './tasks'

describe('fila de sincronização (outbox)', () => {
  it('registra alterações locais na mesma transação, mas não as vindas da nuvem', async () => {
    selectDatabase({ userId: 'teste-outbox' })
    await clearAll()
    await db.outbox.clear()

    const task = await createTask({ title: 'Sincronizar' })
    const keys = (await db.outbox.toArray()).map((e) => e.key)
    expect(keys).toContain(`tasks:${task.id}`)
    expect(keys).toContain('counters:task')
    expect(keys.some((k) => k.startsWith('activity:'))).toBe(true)

    await db.outbox.clear()
    await db.transaction('rw', ['tasks'], async (tx) => {
      markRemote(tx)
      await db.tasks.put({ ...task, title: 'Vindo da nuvem' })
    })
    expect(await db.outbox.count()).toBe(0)

    await deleteTask(task.id)
    const del = await db.outbox.get(`tasks:${task.id}`)
    expect(del?.op).toBe('delete')

    await db.outbox.clear()
    await clearAll()
    const entries = await db.outbox.toArray()
    expect(entries.every((e) => e.op === 'delete')).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('o banco sem conta não acumula fila', async () => {
    selectDatabase('local')
    await clearAll()
    await createTask({ title: 'Local' })
    expect(await db.outbox.count()).toBe(0)
  })
})
