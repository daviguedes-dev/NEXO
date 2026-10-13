import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { FeedbackProvider } from './components/feedback'
import { Shell } from './features/shell/Shell'
import { OverviewPage } from './features/overview/OverviewPage'
import { TasksPage } from './features/tasks/TasksPage'
import { ProjectsPage } from './features/projects/ProjectsPage'
import { RoutinesPage } from './features/routines/RoutinesPage'
import { RoutineDetailPage } from './features/routines/RoutineDetailPage'
import { MethodsPage } from './features/methods/MethodsPage'
import { MethodDetailPage } from './features/methods/MethodDetailPage'
import { RunPage } from './features/methods/RunPage'
import { PublishingPage } from './features/publishing/PublishingPage'
import { TemplatePage } from './features/publishing/TemplatePage'
import { SettingsPage } from './features/settings/SettingsPage'
import { NotFound } from './features/shell/NotFound'

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'tarefas', element: <TasksPage /> },
      { path: 'tarefas/:number', element: <TasksPage /> },
      { path: 'projetos', element: <ProjectsPage /> },
      { path: 'rotinas', element: <RoutinesPage /> },
      { path: 'rotinas/:number', element: <RoutineDetailPage /> },
      { path: 'metodos', element: <MethodsPage /> },
      { path: 'metodos/execucoes/:number', element: <RunPage /> },
      { path: 'metodos/:number', element: <MethodDetailPage /> },
      { path: 'publicacoes', element: <PublishingPage /> },
      { path: 'publicacoes/modelos/:number', element: <TemplatePage /> },
      { path: 'publicacoes/:number', element: <PublishingPage /> },
      { path: 'configuracoes', element: <SettingsPage /> },
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
