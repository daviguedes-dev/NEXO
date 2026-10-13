# Nexo

Sistema de organização pessoal e operacional: rotinas, tarefas, métodos de trabalho e publicações, com histórico rastreável de tudo o que muda — inspirado na organização e rastreabilidade do GitHub.

## Módulos

| Módulo                  | O que faz                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visão geral**         | Resumo do dia, rotinas de hoje, prioridades, métodos em execução, projetos em andamento, atividade recente e mapa de consistência (estilo contribuições do GitHub).                                                                                 |
| **Tarefas**             | Status, prioridade, etiquetas, projeto, prazo, subtarefas e observações. Lista agrupada ou Kanban (arrastar com mouse, toque ou teclado). Filtros, busca e ordenação ficam na URL. Mudanças importantes vão para o histórico.                       |
| **Projetos**            | Agrupam tarefas; progresso calculado pelas tarefas concluídas.                                                                                                                                                                                      |
| **Rotinas**             | Diárias, semanais ou a cada N dias, com horário, etapas e prioridade. Marcação por etapa, registro de dias anteriores, sequência, taxa de 30 dias e mapa por rotina. Cada execução guarda as etapas da época: editar a rotina não altera o passado. |
| **Métodos de trabalho** | Processos documentados (Markdown) com etapas e checklists, versões (v1, v2…), duplicação e execuções independentes — cada execução é uma cópia da versão em que foi iniciada.                                                                       |
| **Publicações**         | Modelos genéricos de postagem (etapas, estrutura do texto, objetivo, plataformas livres), fluxo em Kanban, calendário mensal, histórico de status e registro de publicadas com links. Sem vínculo com canal ou plataforma específica.               |
| **Configurações**       | Backup/restauração em JSON, armazenamento persistente, etiquetas, dados de exemplo e limpeza.                                                                                                                                                       |

**Rastreabilidade:** todo registro tem referência legível (`TSK-12`, `PRJ-2`, `RTN-3`, `MTD-1`, `EXE-5`, `PUB-8`, `MOD-1`) e uma trilha de histórico imutável. A busca global (`Ctrl/⌘ K`) encontra por título ou referência.

**Atalhos:** `Ctrl/⌘ K` ou `/` busca · `C` nova tarefa · `Esc` fecha painéis.

## Abrir sem instalar nada

Gere (ou baixe) o arquivo único **`Nexo.html`** e abra com duplo clique — tudo (código, estilos, fontes) vai embutido e funciona sem servidor:

```bash
npm run build:standalone   # cria dist-standalone/Nexo.html
```

> Abrir o `index.html` da raiz direto no navegador **não funciona** (é o código-fonte): use o `Nexo.html` ou o servidor de desenvolvimento abaixo.

## Executar localmente

Requer Node.js 20.19+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script                     | Uso                                                               |
| -------------------------- | ----------------------------------------------------------------- |
| `npm run build`            | typecheck + build de produção em `dist/`                          |
| `npm run build:standalone` | arquivo único `dist-standalone/Nexo.html` (abre com duplo clique) |
| `npm run preview`          | serve o build                                                     |
| `npm run check`            | typecheck, lint, testes unitários e build                         |
| `npm test`                 | testes de domínio (Vitest)                                        |
| `npm run test:e2e`         | testes de ponta a ponta (Playwright, desktop e celular)           |
| `npm run format`           | Prettier                                                          |

Na primeira abertura, use **Carregar exemplos** para ver o sistema preenchido com dados genéricos (removíveis em Configurações).

## Arquitetura

- **Vite + React 19 + TypeScript** (estrito), React Router, ícones Lucide, fontes Geist/Geist Mono auto-hospedadas.
- **Local-first:** dados no IndexedDB do navegador via Dexie; nenhum backend ou conta é necessário. Faça backups em Configurações.
- Rotas carregadas sob demanda; o pacote inicial contém só o shell e a visão geral.

```
src/
  db/          modelo de dados, banco (Dexie), ações por módulo, histórico, backup, exemplos
  lib/         datas, recorrência, estatísticas (sequências, consistência), metadados
  components/  design system: botões, campos, diálogos, menus, timeline, mapa de consistência…
  features/    telas por módulo (overview, tasks, projects, routines, methods, publishing, settings, shell)
  styles/      tokens (#0B1220, #FFFFFF, #14B8A6, #F1F5F9), base, componentes e módulos
e2e/           testes Playwright
```

## Publicação

É um site estático: publique a pasta `dist/` em qualquer hospedagem (Vercel, Netlify, GitHub Pages, servidor próprio), inclusive em subpastas. As rotas usam `#` (ex.: `/#/tarefas/12`), então não é preciso configurar redirecionamentos no servidor.

## Pendências

- A especificação recebida terminava no item 6 (incompleto); os módulos 1–5 estão implementados.
- Sincronização entre dispositivos exigiria um backend (ex.: Supabase) — hoje os dados ficam no navegador.
