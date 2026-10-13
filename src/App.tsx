import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { FeedbackProvider } from './components/feedback'
import { Shell } from './features/shell/Shell'
import { OverviewPage } from './features/overview/OverviewPage'
import { NotFound } from './features/shell/NotFound'

/** Carrega cada módulo sob demanda (a visão geral vem no pacote inicial). */
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K): LazyExoticComponent<ComponentType> =>
  lazy(() => load().then((m) => ({ default: m[name] })))

const TasksPage = page(() => import('./features/tasks/TasksPage'), 'TasksPage')
const ProjectsPage = page(() => import('./features/projects/ProjectsPage'), 'ProjectsPage')
const RoutinesPage = page(() => import('./features/routines/RoutinesPage'), 'RoutinesPage')
const RoutineDetailPage = page(() => import('./features/routines/RoutineDetailPage'), 'RoutineDetailPage')
const MethodsPage = page(() => import('./features/methods/MethodsPage'), 'MethodsPage')
const MethodDetailPage = page(() => import('./features/methods/MethodDetailPage'), 'MethodDetailPage')
const RunPage = page(() => import('./features/methods/RunPage'), 'RunPage')
const PublishingPage = page(() => import('./features/publishing/PublishingPage'), 'PublishingPage')
const TemplatePage = page(() => import('./features/publishing/TemplatePage'), 'TemplatePage')
const SettingsPage = page(() => import('./features/settings/SettingsPage'), 'SettingsPage')

const el = (C: ComponentType) => (
  <Suspense fallback={<div className="page" aria-busy="true" />}>
    <C />
  </Suspense>
)

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'tarefas', element: el(TasksPage) },
      { path: 'tarefas/:number', element: el(TasksPage) },
      { path: 'projetos', element: el(ProjectsPage) },
      { path: 'rotinas', element: el(RoutinesPage) },
      { path: 'rotinas/:number', element: el(RoutineDetailPage) },
      { path: 'metodos', element: el(MethodsPage) },
      { path: 'metodos/execucoes/:number', element: el(RunPage) },
      { path: 'metodos/:number', element: el(MethodDetailPage) },
      { path: 'publicacoes', element: el(PublishingPage) },
      { path: 'publicacoes/modelos/:number', element: el(TemplatePage) },
      { path: 'publicacoes/:number', element: el(PublishingPage) },
      { path: 'configuracoes', element: el(SettingsPage) },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export function App() {
  return (
    <FeedbackProvider>
      <RouterProvider router={router} />
    </FeedbackProvider>
  )
}
