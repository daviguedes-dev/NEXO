import { test as base, expect } from '@playwright/test'

/** Falha o teste se a página registrar erros no console. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await use(errors)
    expect(errors, 'erros no console').toEqual([])
  },
})

export { expect }
