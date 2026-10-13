import type { EntityType } from '../db/types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Prefixo da referência legível de cada tipo de registro. */
export const KEY_PREFIX: Record<EntityType, string> = {
  task: 'TSK',
  project: 'PRJ',
  routine: 'RTN',
  method: 'MTD',
  run: 'EXE',
  post: 'PUB',
  template: 'MOD',
}

export function entityKey(type: EntityType, number: number): string {
  return `${KEY_PREFIX[type]}-${number}`
}
