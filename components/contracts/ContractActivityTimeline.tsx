import { CalendarIcon, CheckCircle2Icon, CircleDashedIcon, Clock3Icon, CircleIcon } from 'lucide-react'

import type { ContractViewerRole, ContractWithWorkflow, MilestoneWithWorkflow } from './contract-workflow'
import { milestoneStatusTone, money, normalizeStatus } from './contract-workflow'
import { MilestoneActions } from './MilestoneActions'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type ContractActivityTimelineProps = {
  contract: ContractWithWorkflow
  viewerRole: ContractViewerRole
  onFund?: (milestonePublicId: string) => void
  onRetry?: (milestonePublicId: string) => void
  onContinue?: (checkoutUrl: string) => void
  onSubmit?: (milestone: MilestoneWithWorkflow) => void
  onApprove?: (milestonePublicId: string) => void
  onRequestRevision?: (milestone: MilestoneWithWorkflow) => void
  onDispute?: (milestonePublicId: string) => void
  busyMilestonePublicId?: string | null
}

function milestoneIcon(status: string) {
  switch (normalizeStatus(status)) {
    case 'released':
      return <CheckCircle2Icon className="h-4 w-4" />
    case 'submitted':
      return <Clock3Icon className="h-4 w-4" />
    case 'funded':
    case 'revision_requested':
      return <CircleDashedIcon className="h-4 w-4" />
    default:
      return <CircleIcon className="h-4 w-4" />
  }
}

export function ContractActivityTimeline({
  contract,
  viewerRole,
  onFund,
  onRetry,
  onContinue,
  onSubmit,
  onApprove,
  onRequestRevision,
  onDispute,
  busyMilestonePublicId,
}: ContractActivityTimelineProps) {
  const milestones = contract.milestones ?? []

  return (
    <div className="space-y-4">
      {milestones.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No milestones have been created yet.
          </CardContent>
        </Card>
      ) : (
        milestones.map((milestone, index) => {
          const isBusy = busyMilestonePublicId === milestone.public_id

          return (
            <div key={milestone.public_id} className="relative">
              {index > 0 ? <Separator className="absolute left-5 top-0 h-full" orientation="vertical" /> : null}

              <div className="flex gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background">
                  {milestoneIcon(milestone.status)}
                </div>

                <Card className="w-full rounded-3xl border bg-card/90">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{milestone.title}</h3>
                          <Badge className={milestoneStatusTone(milestone.status)}>
                            {milestone.status_label || normalizeStatus(milestone.status).replaceAll('_', ' ')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            Due {new Date(milestone.due_date).toLocaleDateString()}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium text-foreground">{money(milestone.amount)} DZD</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            Milestone #{milestone.order ?? index + 1}
                          </span>
                        </div>
                      </div>

                      <MilestoneActions
                        contract={contract}
                        milestone={milestone}
                        viewerRole={viewerRole}
                        busy={isBusy}
                        onFund={onFund}
                        onRetry={onRetry}
                        onContinue={onContinue}
                        onSubmit={onSubmit}
                        onApprove={onApprove}
                        onRequestRevision={onRequestRevision}
                        onDispute={onDispute}
                      />
                    </div>

                    {milestone.description ? (
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="mt-1 text-sm font-medium">
                          {milestone.submitted_at ? new Date(milestone.submitted_at).toLocaleString() : '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Approved</p>
                        <p className="mt-1 text-sm font-medium">
                          {milestone.approved_at ? new Date(milestone.approved_at).toLocaleString() : '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Released</p>
                        <p className="mt-1 text-sm font-medium">
                          {milestone.released_at ? new Date(milestone.released_at).toLocaleString() : '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Payment</p>
                        <p className="mt-1 text-sm font-medium">
                          {milestone.latest_payment_attempt_internal_status
                            ? normalizeStatus(milestone.latest_payment_attempt_internal_status).replaceAll('_', ' ')
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {milestone.submission_note || milestone.submission_link ? (
                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-sm font-medium">Submission</p>
                        {milestone.submission_note ? (
                          <p className="mt-1 text-sm text-muted-foreground">{milestone.submission_note}</p>
                        ) : null}
                        {milestone.submission_link ? (
                          <p className="mt-1 break-all text-sm text-muted-foreground">{milestone.submission_link}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {milestone.revision_scope || milestone.revision_note ? (
                      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                        <p className="text-sm font-medium text-orange-700">Revision notes</p>
                        {milestone.revision_scope ? (
                          <p className="mt-1 text-sm text-orange-700/80">Scope: {milestone.revision_scope}</p>
                        ) : null}
                        {milestone.revision_note ? (
                          <p className="mt-1 text-sm text-orange-700/80">Note: {milestone.revision_note}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
