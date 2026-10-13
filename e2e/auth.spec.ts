import { test, expect } from './fixtures'

const SB = 'https://harpmzexpfpqfppzcstw.supabase.co'

/** Supabase simulado: autenticação e tabela de sincronização em memória. */
async function mockSupabase(page: import('@playwright/test').Page) {
  const rows: Record<string, unknown>[] = []
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ana@exemplo.com',
    user_metadata: { name: 'Ana Souza' },
    app_metadata: {},
    created_at: new Date().toISOString(),
  }
  const session = { access_token: 'tok', refresh_token: 'ref', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }
  const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route(`${SB}/auth/v1/**`, (route) => {
    const url = route.request().url()
    if (url.includes('/token')) {
      const body = route.request().postDataJSON() as { password?: string }
      return route.fulfill(
        body.password === 'senha-certa-123'
          ? json(session)
          : json({ code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400),
      )
    }
    if (url.includes('/user')) return route.fulfill(json(user))
    if (url.includes('/logout')) return route.fulfill({ status: 204 })
    return route.fulfill(json({}))
  })
  await page.route(`${SB}/rest/v1/nexo_records**`, (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      const incoming = req.postDataJSON() as Record<string, unknown>[]
      for (const r of incoming) {
        const i = rows.findIndex((x) => x.collection === r.collection && x.id === r.id)
        const row = { ...r, updated_at: new Date().toISOString() }
        if (i >= 0) rows[i] = row
        else rows.push(row)
      }
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
    return route.fulfill(json([]))
  })
  return rows
}

test.describe('Conta e tema', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('nexo:e2e-auth')) {
        sessionStorage.setItem('nexo:e2e-auth', '1')
        localStorage.removeItem('nexo:mode')
      }
    })
  })

  test('entrar com e-mail, sincronizar e sair', async ({ page, consoleErrors }) => {
    const rows = await mockSupabase(page)
    await page.goto('/')
    const form = page.getByRole('form', { name: 'Entrar' })
    await form.getByLabel('E-mail').fill('ana@exemplo.com')
    await form.getByLabel('Senha', { exact: true }).fill('errada')
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha')
    consoleErrors.length = 0 // 400 esperado no login inválido

    await form.getByLabel('Senha', { exact: true }).fill('senha-certa-123')
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao Nexo.' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Conta: Ana Souza/ })).toBeVisible()

    await page.goto('/#/tarefas')
    await expect(page.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeVisible()
    await page.keyboard.press('c')
    const dialog = page.getByRole('dialog', { name: 'Nova tarefa' })
    await dialog.getByLabel('Título').fill('Tarefa sincronizada')
    await dialog.getByRole('button', { name: 'Criar tarefa' }).click()
    await expect
      .poll(() => rows.some((r) => r.collection === 'tasks' && (r.data as { title?: string })?.title === 'Tarefa sincronizada'), { timeout: 10_000 })
      .toBe(true)

    await page.getByRole('button', { name: /Conta: Ana Souza/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByRole('form', { name: 'Entrar' })).toBeVisible()
  })

  test('modo sem conta e tema escuro persistem', async ({ page, consoleErrors: _ }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: 'Tema escuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Continuar sem conta' }).click()
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao Nexo.' })).toBeVisible()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao Nexo.' })).toBeVisible()
  })
})
