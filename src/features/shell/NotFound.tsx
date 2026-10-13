import { Compass } from 'lucide-react'
import { EmptyState, LinkButton } from '../../components/ui'

export function NotFound({ what = 'Página' }: { what?: string }) {
  return (
    <div className="page">
      <EmptyState icon={Compass} title={`${what} não encontrada`} action={<LinkButton to="/">Ir para a visão geral</LinkButton>}>
        O endereço pode ter mudado ou o registro foi excluído. O histórico em Visão geral mantém o que aconteceu com ele.
      </EmptyState>
    </div>
  )
}
