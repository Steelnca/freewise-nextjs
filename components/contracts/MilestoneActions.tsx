import { HandCoinsIcon, PenToolIcon, SendIcon, ShieldCheckIcon, ShieldAlertIcon } from 'lucide-react'

import type { ContractViewerRole, ContractWithWorkflow, MilestoneWithWorkflow } from './contract-workflow'
import { getMilestonePrimaryAction } from './contract-workflow'

import { Button } from '@/components/ui/button'

type MilestoneActionsProps = {
  contract: ContractWithWorkflow
  milestone: MilestoneWithWorkflow
  viewerRole: ContractViewerRole
  busy?: boolean
  onFund?: (milestonePublicId: string) => void
  onRetry?: (milestonePublicId: string) => void
  onContinue?: (checkoutUrl: string) => void
  onSubmit?: (milestone: MilestoneWithWorkflow) => void
  onApprove?: (milestonePublicId: string) => void
  onRequestRevision?: (milestone: MilestoneWithWorkflow) => void
  onDispute?: (milestonePublicId: string) => void
}

export function MilestoneActions({
  contract,
  milestone,
  viewerRole,
  busy,
  onFund,
  onRetry,
  onContinue,
  onSubmit,
  onApprove,
  onRequestRevision,
  onDispute,
}: MilestoneActionsProps) {
  const action = getMilestonePrimaryAction(contract, milestone, viewerRole)
  if (!action) return null

  const commonProps = { disabled: busy, className: 'shrink-0' as const }

  if (action.kind === 'fund' && onFund) {
    return (
      <Button {...commonProps} onClick={() => onFund(action.milestonePublicId)}>
        <HandCoinsIcon className="mr-2 h-4 w-4" />
        {busy ? 'Opening checkout…' : action.label}
      </Button>
    )
  }

  if (action.kind === 'retry' && onRetry) {
    return (
      <Button {...commonProps} onClick={() => onRetry(action.milestonePublicId)}>
        <HandCoinsIcon className="mr-2 h-4 w-4" />
        {busy ? 'Creating retry…' : action.label}
      </Button>
    )
  }

  if (action.kind === 'continue' && onContinue) {
    return (
      <Button {...commonProps} onClick={() => onContinue(action.checkoutUrl)}>
        <HandCoinsIcon className="mr-2 h-4 w-4" />
        {action.label}
      </Button>
    )
  }

  if (action.kind === 'submit' && onSubmit) {
    return (
      <Button {...commonProps} onClick={() => onSubmit(milestone)}>
        <SendIcon className="mr-2 h-4 w-4" />
        {action.label}
      </Button>
    )
  }

  if (action.kind === 'approve' && onApprove) {
    return (
      <Button {...commonProps} onClick={() => onApprove(action.milestonePublicId)}>
        <ShieldCheckIcon className="mr-2 h-4 w-4" />
        {action.label}
      </Button>
    )
  }

  if (action.kind === 'request_revision' && onRequestRevision) {
    return (
      <Button {...commonProps} variant="outline" onClick={() => onRequestRevision(milestone)}>
        <PenToolIcon className="mr-2 h-4 w-4" />
        {action.label}
      </Button>
    )
  }

  if (action.kind === 'dispute' && onDispute) {
    return (
      <Button {...commonProps} variant="outline" onClick={() => onDispute(action.milestonePublicId)}>
        <ShieldAlertIcon className="mr-2 h-4 w-4" />
        {action.label}
      </Button>
    )
  }

  return null
}
