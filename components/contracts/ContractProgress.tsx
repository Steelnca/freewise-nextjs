import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { ContractWithWorkflow } from './contract-workflow'
import { contractProgressLabel, milestoneSummary, money, normalizeStatus } from './contract-workflow'

type ContractProgressProps = {
  contract: ContractWithWorkflow
  compact?: boolean
}

export function ContractProgress({ contract, compact = false }: ContractProgressProps) {
  const summary = milestoneSummary(contract)
  const percent = summary.progress

  return (
    <div className={`space-y-3 rounded-3xl border bg-card/80 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Progress</p>
          <p className="text-sm text-muted-foreground">{contractProgressLabel(contract)}</p>
        </div>
        <Badge variant="outline">{percent}%</Badge>
      </div>

      <Progress value={percent} className="h-2" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">Total milestones</p>
          <p className="mt-1 text-lg font-semibold">{summary.total}</p>
        </div>
        <div className="rounded-2xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-lg font-semibold">{summary.completed}</p>
        </div>
        <div className="rounded-2xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">Remaining amount</p>
          <p className="mt-1 text-lg font-semibold">{money(summary.remainingAmount)} DZD</p>
        </div>
        <div className="rounded-2xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">Contract status</p>
          <p className="mt-1 text-lg font-semibold capitalize">
            {normalizeStatus(contract.status).replaceAll('_', ' ')}
          </p>
        </div>
      </div>
    </div>
  )
}
