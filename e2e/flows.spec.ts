import { test, expect } from './fixtures'

test.describe('Nexo — fluxos principais', () => {
  test('primeiro acesso mostra o guia inicial', async ({ page, consoleErrors: _ }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao Nexo.' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Registre uma tarefa/ })).toBeVisible()
  })

  test('tarefa: criar pelo atalho, concluir subtarefa, mudar status e ver o histórico', async ({ page, consoleErrors: _ }) => {
    await page.goto('/#/tarefas')
    await page.keyboard.press('c')
    const dialog = page.getByRole('dialog', { name: 'Nova tarefa' })
    await dialog.getByLabel('Título').fill('Preparar relatório semanal')
    await dialog.getByLabel('Prioridade').selectOption('high')
    await dialog.getByRole('button', { name: 'Criar tarefa' }).click()
    await expect(page.getByText('TSK-1 criada')).toBeVisible()

    await page.getByRole('link', { name: 'Preparar relatório semanal' }).click()
    await expect(page).toHaveURL(/\/tarefas\/1/)
    const sheet = page.getByRole('dialog')
    await sheet.getByLabel('Nova subtarefa').fill('Coletar números')
    await sheet.getByLabel('Nova subtarefa').press('Enter')
    const sub = sheet.getByRole('checkbox', { name: 'Concluir Coletar números' })
    await sub.click()
    await expect(sub).toBeChecked()
    await sheet.getByLabel('Status').selectOption('done')

    const history = sheet.locator('.timeline')
    await expect(history).toContainText('Concluiu a tarefa')
    await expect(history).toContainText('Concluiu a subtarefa “Coletar números”')
    await expect(history).toContainText('Criou a tarefa')

    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/tarefas$/)
  })

  test('tarefa: filtros ficam na URL e o Kanban move pelo menu de status', async ({ page, consoleErrors: _ }) => {
    await page.goto('/#/tarefas?nova=1')
    await page.getByLabel('Título').fill('Item do quadro')
    await page.getByRole('button', { name: 'Criar tarefa' }).click()
    await page.getByRole('radio', { name: 'Kanban' }).click()
    await expect(page).toHaveURL(/visao=quadro/)

    const doing = page.getByRole('region', { name: /Em andamento: 0 tarefas/ })
    await expect(doing).toBeVisible()
    await page.locator('.drag', { hasText: 'Item do quadro' }).hover()
    await page.locator('.drag', { hasText: 'Item do quadro' }).getByRole('button', { name: 'Alterar status' }).click()
    await page.getByRole('menuitemradio', { name: 'Em andamento' }).click()
    await expect(page.getByRole('region', { name: /Em andamento: 1 tarefas/ })).toContainText('Item do quadro')

    await page.getByPlaceholder(/Pesquisar por título/).fill('inexistente')
    await expect(page).toHaveURL(/q=inexistente/)
  })

  test('rotina: etapas, conclusão do dia e histórico preservado ao editar', async ({ page, consoleErrors: _ }) => {
    await page.goto('/#/rotinas?nova=1')
    const form = page.getByRole('dialog', { name: 'Nova rotina' })
    await form.getByLabel('Nome').fill('Revisão matinal')
    await form.getByLabel('Nova etapa').fill('Ler e-mails')
    await form.getByLabel('Nova etapa').press('Enter')
    await form.getByLabel('Nova etapa').fill('Planejar agenda')
    await form.getByLabel('Nova etapa').press('Enter')
    await form.getByRole('button', { name: 'Criar rotina' }).click()

    const card = page.locator('.rcheck', { hasText: 'Revisão matinal' })
    await card.getByText('Ler e-mails').click()
    await card.getByText('Planejar agenda').click()
    await expect(card).toHaveClass(/is-done/)

    await page.getByRole('link', { name: 'Revisão matinal' }).first().click()
    await expect(page.locator('.heat-facts')).toContainText('Execuções registradas1')
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Etapa 1', { exact: true }).fill('Ler mensagens')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    // a execução registrada continua com a etapa da época
    await expect(page.locator('.log').first()).toContainText('Ler e-mails')
  })

  test('método: execução independente da versão de origem', async ({ page, consoleErrors: _ }) => {
    await page.goto('/#/metodos?novo=1')
    const form = page.getByRole('dialog', { name: 'Novo método de trabalho' })
    await form.getByLabel('Título', { exact: true }).fill('Fechamento semanal')
    await form.getByLabel('Título da etapa 1').fill('Conferência')
    await form.getByLabel('Novo item na etapa 1').fill('Conferir pendências')
    await form.getByLabel('Novo item na etapa 1').press('Enter')
    await form.getByRole('button', { name: 'Salvar método' }).click()
    await expect(page).toHaveURL(/\/metodos\/1$/)

    await page.getByRole('button', { name: 'Iniciar execução' }).click()
    await expect(page).toHaveURL(/\/metodos\/execucoes\/1$/)
    await page.getByText('Conferir pendências').click()
    await page.getByRole('button', { name: 'Concluir execução' }).click()
    await expect(page.locator('.run-origin')).toContainText('Concluída')

    await page.getByRole('link', { name: /MTD-1/ }).click()
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Título da etapa 1').fill('Conferência final')
    await page.getByRole('button', { name: 'Salvar método' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('v2')
    await expect(page.locator('.run-list')).toContainText('v1')
  })

  test('publicação: modelo, fluxo e registro de publicadas', async ({ page, consoleErrors: _ }) => {
    await page.goto('/#/publicacoes')
    await page.getByRole('button', { name: 'Novo modelo' }).first().click()
    await expect(page).toHaveURL(/\/publicacoes\/modelos\/1$/)
    await page.getByLabel('Nome', { exact: true }).fill('Boletim mensal')
    await page.getByLabel('Plataformas do modelo').fill('Newsletter')
    await page.getByLabel('Plataformas do modelo').press('Enter')
    await page.getByLabel('Nova etapa').fill('Rascunho')
    await page.getByLabel('Nova etapa').press('Enter')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()

    await page.getByRole('button', { name: 'Usar modelo' }).click()
    await expect(page).toHaveURL(/\/publicacoes\/1$/)
    const sheet = page.getByRole('dialog')
    await expect(sheet.locator('.tag', { hasText: 'Newsletter' })).toBeVisible()
    await sheet.getByLabel('Status').selectOption('published')
    await expect(sheet.locator('.timeline')).toContainText('Registrou a publicação como concluída')
    await page.keyboard.press('Escape')

    await page.getByRole('link', { name: /Publicadas/ }).click()
    await expect(page.locator('table')).toContainText('Boletim mensal')
  })

  test('busca global encontra pela referência', async ({ page, consoleErrors: _ }) => {
    await page.goto('/#/tarefas?nova=1')
    await page.getByLabel('Título').fill('Tarefa encontrável')
    await page.getByRole('button', { name: 'Criar tarefa' }).click()
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox', { name: 'Buscar' }).fill('TSK-1')
    await expect(page.getByRole('listbox', { name: 'Resultados' }).getByRole('option').first()).toContainText('Tarefa encontrável')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/tarefas\/1$/)
  })

  test('teclado: link de pular conteúdo e navegação pela sidebar', async ({ page, consoleErrors: _ }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /nexo/ }).first()).toBeFocused()
    // abre o menu "Novo" pelo teclado e escolhe uma opção com as setas
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu', { name: 'Criar novo registro' })).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Nova rotina' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Nova rotina' })).toBeHidden()
  })

  test('backup exporta um arquivo JSON', async ({ page, consoleErrors: _ }) => {
    await page.goto('/#/configuracoes')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar backup' }).click()
    expect((await download).suggestedFilename()).toMatch(/^nexo-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('dados de exemplo preenchem a visão geral', async ({ page, consoleErrors: _ }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Carregar exemplos' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Carregar exemplos' }).click()
    await expect(page.getByRole('heading', { name: 'Consistência' })).toBeVisible()
    await expect(page.getByRole('img', { name: /Mapa de consistência/ })).toBeVisible()
    for (const path of [
      '/tarefas',
      '/tarefas?visao=quadro',
      '/projetos',
      '/rotinas',
      '/rotinas/1',
      '/metodos',
      '/metodos/1',
      '/metodos/execucoes/5',
      '/publicacoes',
      '/publicacoes?aba=calendario',
      '/publicacoes?aba=modelos',
      '/publicacoes?aba=publicadas',
      '/publicacoes/modelos/1',
      '/configuracoes',
    ]) {
      await page.goto('/#' + path)
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })
})
