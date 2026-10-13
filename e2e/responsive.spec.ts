import { test, expect } from './fixtures'

test('celular: navegação lateral e sem rolagem horizontal', async ({ page, consoleErrors: _ }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Carregar exemplos' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Carregar exemplos' }).click()
  await expect(page.getByRole('heading', { name: 'Consistência' })).toBeVisible()

  for (const path of ['/', '/tarefas', '/rotinas', '/metodos', '/publicacoes', '/publicacoes?aba=calendario', '/projetos', '/configuracoes']) {
    await page.goto('/#' + path)
    await expect(page.locator('h1').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `rolagem horizontal em ${path}`).toBeLessThanOrEqual(0)
  }

  await page.getByRole('button', { name: 'Abrir navegação' }).click()
  await page.getByRole('link', { name: 'Rotinas' }).click()
  await expect(page).toHaveURL(/\/rotinas$/)
  await expect(page.locator('.sidebar')).not.toBeInViewport()
})
