import { ChevronRightIcon, HandCoinsIcon, StarIcon } from 'lucide-react'

import { ROUTES } from '@/lib/routes'
import type { ContractViewerRole, ContractWithWorkflow } from './contract-workflow'
import {
  contractCounterpart,
  contractProgressLabel,
  contractStatusTone,
  getContractPrimaryAction,
  milestoneSummary,
  money,
  nextActionMessage,
  nextActionTone,
  normalizeStatus,
  titleFromContract,
} from './contract-workflow'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type ContractCardProps = {
  contract: ContractWithWorkflow
  viewerRole: ContractViewerRole
  onOpenDetails?: (publicId: string) => void
  onFundMilestone?: (milestonePublicId: string) => void
  onRetryFunding?: (milestonePublicId: string) => void
  onReview?: (publicId: string) => void
  actionBusy?: boolean
}

export function ContractCard({
  contract,
  viewerRole,
  onOpenDetails,
  onFundMilestone,
  onRetryFunding,
  onReview,
  actionBusy,
}: ContractCardProps) {
  const summary = milestoneSummary(contract)
  const primaryAction = getContractPrimaryAction(contract, viewerRole)
  const counterpart = contractCounterpart(contract, viewerRole)
  const normalized = normalizeStatus(contract.status)
  const progressValue = summary.progress

  const openDetails = () => {
    if (onOpenDetails) return onOpenDetails(contract.public_id)
    window.location.href = ROUTES.dashboard.contracts.contractDetail(contract.public_id)
  }

  const handlePrimary = () => {
    if (!primaryAction) return openDetails()
    if (primaryAction.kind === 'fund' && onFundMilestone) return onFundMilestone(primaryAction.milestonePublicId)
    if (primaryAction.kind === 'retry' && onRetryFunding) return onRetryFunding(primaryAction.milestonePublicId)
    if (primaryAction.kind === 'review' && onReview) return onReview(contract.public_id)
    if (primaryAction.kind === 'continue') {
      window.location.href = primaryAction.checkoutUrl
      return
    }
    return openDetails()
  }

  return (
    <Card className="group overflow-hidden rounded-3xl ring bg-card/90 transition-all hover:ring-2 hover:ring-foreground/25">
      <CardContent className="p-0">
        <button type="button" onClick={openDetails} className="group/open block w-full text-left cursor-pointer">
          <div className="space-y-4 border-b bg-muted/20 px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-semibold tracking-tight group-hover/open:underline">{titleFromContract(contract)}</h3>
                  <Badge className={contractStatusTone(contract.status)}>{contract.status_label || contract.status}</Badge>
                  {normalized === 'pending_funding' ? (
                    <Badge variant="outline" className="border-amber-200 text-amber-700">
                      Funding needed
                    </Badge>
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground">
                  {viewerRole === 'client' ? 'Freelancer' : 'Client'}: {counterpart || '—'}
                </p>

                <p className="text-sm text-muted-foreground">
                  Contract value <span className="font-medium text-foreground">{money(contract.agreed_price)} DZD</span>
                </p>
              </div>

              <div className="rounded-2xl border bg-background px-3 py-2 text-right">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="text-lg font-semibold">{progressValue}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{contractProgressLabel(contract)}</span>
                <span>{money(summary.remainingAmount)} DZD remaining</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>
        </button>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-xs text-muted-foreground">Milestones</p>
              <p className="mt-1 text-lg font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-xs text-muted-foreground">Funded</p>
              <p className="mt-1 text-lg font-semibold">{summary.funded}</p>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="mt-1 text-lg font-semibold">{summary.submitted}</p>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-xs text-muted-foreground">Released</p>
              <p className="mt-1 text-lg font-semibold">{summary.released}</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Next action</p>
                <p className="text-sm text-muted-foreground">{nextActionMessage(contract.next_action)}</p>
              </div>
              <Badge className={nextActionTone(contract.next_action)} variant="outline">
                {contract.next_action ? contract.next_action.replaceAll('_', ' ') : 'none'}
              </Badge>
            </div>
          </div>

          {contract.milestones?.length ? (
            <div className="space-y-3 rounded-2xl border bg-background p-4">
              {contract.milestones.slice(0, 3).map((milestone) => (
                <div key={milestone.public_id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{milestone.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(milestone.amount)} DZD · Due {new Date(milestone.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="shrink-0">{milestone.status_label || milestone.status.replaceAll('_', ' ')}</Badge>
                </div>
              ))}
              {contract.milestones.length > 3 ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  +{contract.milestones.length - 3} more milestone{contract.milestones.length - 3 === 1 ? '' : 's'}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              No milestones created yet.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Due {new Date(contract.deadline).toLocaleDateString()}
            </div>

            <div className="flex flex-wrap gap-2">
              {primaryAction?.kind === 'fund' && onFundMilestone ? (
                <Button onClick={handlePrimary} disabled={actionBusy}>
                  <HandCoinsIcon className="mr-2 h-4 w-4" />
                  {actionBusy ? 'Opening checkout…' : primaryAction.label}
                </Button>
              ) : primaryAction?.kind === 'retry' && onRetryFunding ? (
                <Button onClick={handlePrimary} disabled={actionBusy}>
                  <HandCoinsIcon className="mr-2 h-4 w-4" />
                  {actionBusy ? 'Creating retry…' : primaryAction.label}
                </Button>
              ) : primaryAction?.kind === 'continue' ? (
                <Button onClick={handlePrimary} disabled={actionBusy}>
                  <HandCoinsIcon className="mr-2 h-4 w-4" />
                  {primaryAction.label}
                </Button>
              ) : primaryAction?.kind === 'review' && onReview ? (
                <Button onClick={handlePrimary}>
                  <StarIcon className="mr-2 h-4 w-4" />
                  {primaryAction.label}
                </Button>
              ) : (
                <Button variant="outline" onClick={openDetails}>
                  Open details
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
