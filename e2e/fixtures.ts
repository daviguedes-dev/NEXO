import { test as base, expect } from '@playwright/test'

/** Falha o teste se a página registrar erros no console. */
export const test = base.extend<{ consoleErrors: string[] }>({
  /** Por padrão os fluxos usam o modo sem conta (sem rede). */
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('nexo:e2e-init')) {
        sessionStorage.setItem('nexo:e2e-init', '1')
        if (!localStorage.getItem('nexo:mode')) localStorage.setItem('nexo:mode', 'local')
      }
    })
    await use(page)
  },
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await use(errors)
    expect(errors, 'erros no console').toEqual([])
  },
})

export { expect }
