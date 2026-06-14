'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftIcon, HandCoinsIcon, PlusIcon, ShieldAlertIcon, StarIcon, UserIcon } from 'lucide-react'

import { contracts as contractsApi, payments, proposals as proposalsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Proposal } from '@/lib/types'
import { useLocale } from '@/context/locale-context'

import { ContractActivityTimeline } from '@/components/contracts/ContractActivityTimeline'
import { ContractProgress } from '@/components/contracts/ContractProgress'
import type { ContractViewerRole, ContractWithWorkflow, MilestoneWithWorkflow } from '@/components/contracts/contract-workflow'
import {
  contractStatusTone,
  getContractPrimaryAction,
  money,
  nextActionMessage,
  nextActionTone,
  normalizeStatus,
  titleFromContract,
} from '@/components/contracts/contract-workflow'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import CreateMilestoneDialog from '@/components/dialogs/contracts/CreateMilestoneDialog'
import SubmitWorkDialog from '@/components/dialogs/contracts/SubmitWorkDialog'
import RequestRevisionDialog from '@/components/dialogs/contracts/RequestRevisionDialog'

type ProposalWithExtras = Proposal & {
  freelancer_rating?: number
}

type ContractDetailState = {
  contract: ContractWithWorkflow | null
  acceptedProposal: ProposalWithExtras | null
  loading: boolean
  actionMilestonePublicId: string | null
}

function getLocaleStrings(locale?: string) {
  const lang = (locale || 'en').toLowerCase()
  const en = {
    back: 'Back to contracts',
    loading: 'Loading contract…',
    notFoundTitle: 'Contract not found',
    notFoundDescription: 'You might not have access to this contract, or it may no longer exist.',
    clientWorkspace: 'Client workspace',
    freelancerWorkspace: 'Freelancer workspace',
    nextAction: 'Next action',
    milestones: 'Milestones',
    summary: 'Contract summary',
    acceptedProposal: 'Accepted proposal',
    contractBrief: 'Contract brief',
    addMilestone: 'Add milestone',
    loadingCheckout: 'Opening checkout…',
    creatingRetry: 'Creating retry…',
  }
  if (lang.startsWith('fr')) return en
  if (lang.startsWith('ar')) return en
  return en
}

export default function ContractDetailPage() {
  const params = useParams<{ publicId?: string }>()
  const contractPublicId = String(params?.publicId || '')
  const router = useRouter()
  const localeCtx = useLocale() as any
  const copy = useMemo(() => getLocaleStrings(localeCtx?.locale), [localeCtx?.locale])

  const [state, setState] = useState<ContractDetailState>({
    contract: null,
    acceptedProposal: null,
    loading: true,
    actionMilestonePublicId: null,
  })
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [submitDialogMilestone, setSubmitDialogMilestone] = useState<MilestoneWithWorkflow | null>(null)
  const [revisionDialogMilestone, setRevisionDialogMilestone] = useState<MilestoneWithWorkflow | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

  const loadContract = async () => {
    if (!contractPublicId) return
    setState((current) => ({ ...current, loading: true }))

    try {
      const contractRes = await contractsApi.get(contractPublicId)
      const contract = contractRes.data as ContractWithWorkflow

      let acceptedProposal: ProposalWithExtras | null = null
      if (contract.viewer_role === 'client' && contract.job) {
        try {
          const proposalsRes = await proposalsApi.forJob(contract.job)
          acceptedProposal =
            (proposalsRes.data as ProposalWithExtras[]).find(
              (proposal) => normalizeStatus(proposal.status) === 'accepted'
            ) || null
        } catch {
          acceptedProposal = null
        }
      }

      setState({
        contract,
        acceptedProposal,
        loading: false,
        actionMilestonePublicId: null,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load contract.')
      setState({
        contract: null,
        acceptedProposal: null,
        loading: false,
        actionMilestonePublicId: null,
      })
    }
  }

  useEffect(() => {
    void loadContract()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractPublicId])

  const reloadContract = async () => {
    await loadContract()
  }

  const contract = state.contract
  const acceptedProposal = state.acceptedProposal
  const milestones = contract?.milestones ?? []
  const viewerRole = (contract?.viewer_role ?? null) as ContractViewerRole
  const isClientParty = viewerRole === 'client'
  const isFreelancerParty = viewerRole === 'freelancer'
  const hasSuspension = contract?.has_suspension ?? false
  const isFundingLocked = contract?.is_funding_locked ?? false
  const isFinished = contract?.is_finished ?? false
  const nextAction = contract?.next_action ?? 'no_access'
  const currentActionMessage = nextActionMessage(nextAction)
  const actionMilestone =
    milestones.find((milestone) => milestone.public_id === contract?.next_action_milestone_public_id) || null

  const contractTitle = contract ? titleFromContract(contract) : `Contract #${contractPublicId}`

  const fundMilestone = async (milestonePublicId: string) => {
    setState((current) => ({ ...current, actionMilestonePublicId: milestonePublicId }))
    try {
      const { data } = await payments.fundMilestone(milestonePublicId)
      window.location.href = data.checkout_url
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to initiate payment.')
      setState((current) => ({ ...current, actionMilestonePublicId: null }))
    }
  }

  const retryFunding = async (milestonePublicId: string) => {
    setState((current) => ({ ...current, actionMilestonePublicId: milestonePublicId }))
    try {
      const { data } = await payments.retryFundMilestone(milestonePublicId)
      window.location.href = data.checkout_url
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.info(err?.response?.data?.detail || 'This milestone is already paid.')
        await reloadContract()
        return
      }
      toast.error(err?.response?.data?.detail || 'Failed to create a retry checkout.')
      setState((current) => ({ ...current, actionMilestonePublicId: null }))
    }
  }

  const approveMilestone = async (milestonePublicId: string) => {
    setState((current) => ({ ...current, actionMilestonePublicId: milestonePublicId }))
    try {
      await contractsApi.approveMilestone(milestonePublicId)
      toast.success('Milestone approved.')
      await reloadContract()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to approve milestone.')
    } finally {
      setState((current) => ({ ...current, actionMilestonePublicId: null }))
    }
  }

  const disputeMilestone = async (milestonePublicId: string) => {
    setState((current) => ({ ...current, actionMilestonePublicId: milestonePublicId }))
    try {
      await contractsApi.disputeMilestone(milestonePublicId)
      toast.success('Dispute opened.')
      await reloadContract()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to open dispute.')
    } finally {
      setState((current) => ({ ...current, actionMilestonePublicId: null }))
    }
  }

  const submitWork = (milestone: MilestoneWithWorkflow) => setSubmitDialogMilestone(milestone)
  const requestRevision = (milestone: MilestoneWithWorkflow) => setRevisionDialogMilestone(milestone)
  const continueFunding = (checkoutUrl: string) => {
    window.location.href = checkoutUrl
  }

  if (state.loading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-48 rounded-xl bg-muted" />
        <div className="h-40 rounded-3xl bg-muted" />
        <div className="h-60 rounded-3xl bg-muted" />
      </main>
    )
  }

  if (!contract) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{copy.notFoundTitle}</CardTitle>
            <CardDescription>{copy.notFoundDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={ROUTES.dashboard.contracts.root}>{copy.back}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const primaryAction = getContractPrimaryAction(contract, viewerRole)

  const handlePrimary = () => {
    if (!primaryAction) return

    if (primaryAction.kind === 'fund') return void fundMilestone(primaryAction.milestonePublicId)
    if (primaryAction.kind === 'retry') return void retryFunding(primaryAction.milestonePublicId)
    if (primaryAction.kind === 'continue') return continueFunding(primaryAction.checkoutUrl)
    if (primaryAction.kind === 'review') return setReviewDialogOpen(true)
    if (primaryAction.kind === 'submit') {
      const milestone = milestones.find((item) => item.public_id === primaryAction.milestonePublicId)
      if (milestone) setSubmitDialogMilestone(milestone)
      return
    }
    if (primaryAction.kind === 'open') {
      const target = contract.next_action_milestone_public_id
      if (target) {
        document.getElementById(`milestone-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="-ml-2 w-fit">
        <Link href={ROUTES.dashboard.contracts.root}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {copy.back}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{contractTitle}</h1>
            <Badge className={contractStatusTone(contract.status)}>{contract.status_label || contract.status}</Badge>
            {viewerRole ? (
              <Badge variant="secondary">{viewerRole === 'client' ? copy.clientWorkspace : copy.freelancerWorkspace}</Badge>
            ) : (
              <Badge variant="secondary">No access</Badge>
            )}
            {isFundingLocked ? <Badge variant="outline">Funding locked</Badge> : null}
            {hasSuspension ? <Badge variant="destructive">Suspended</Badge> : null}
            {isFinished ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Finished</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Contract #{contract.public_id} · {money(contract.agreed_price)} DZD · Due {new Date(contract.deadline).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{contract.funding_progress ?? 0}% funded</Badge>
          <Badge variant="outline">{milestones.length} milestone{milestones.length === 1 ? '' : 's'}</Badge>
        </div>
      </div>

      <Card className={`rounded-3xl border ${hasSuspension ? 'border-red-200 bg-red-50/40' : 'border-border'}`}>
        <CardContent className="p-5">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={`mt-1 rounded-full border p-2 ${nextActionTone(nextAction)}`}>
                  {hasSuspension ? <ShieldAlertIcon className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">{copy.nextAction}</p>
                  <p className="text-sm text-muted-foreground">{currentActionMessage}</p>
                </div>
              </div>

              {actionMilestone ? (
                <div className="rounded-2xl border bg-background/80 p-4">
                  <p className="text-sm font-medium">Action milestone</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {actionMilestone.title} · {money(actionMilestone.amount)} DZD · {normalizeStatus(actionMilestone.status).replaceAll('_', ' ')}
                  </p>
                </div>
              ) : null}

              {primaryAction ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handlePrimary}>
                    {primaryAction.kind === 'fund' ? (
                      <>
                        <HandCoinsIcon className="mr-2 h-4 w-4" />
                        {state.actionMilestonePublicId === primaryAction.milestonePublicId ? copy.loadingCheckout : 'Fund escrow'}
                      </>
                    ) : primaryAction.kind === 'retry' ? (
                      <>
                        <HandCoinsIcon className="mr-2 h-4 w-4" />
                        {state.actionMilestonePublicId === primaryAction.milestonePublicId ? copy.creatingRetry : 'Retry funding'}
                      </>
                    ) : primaryAction.kind === 'review' ? (
                      <>
                        <StarIcon className="mr-2 h-4 w-4" />
                        Leave review
                      </>
                    ) : primaryAction.kind === 'submit' ? (
                      <>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        {primaryAction.label}
                      </>
                    ) : (
                      primaryAction.label
                    )}
                  </Button>
                </div>
              ) : null}
            </div>

            <ContractProgress contract={contract} />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Client</p><p className="mt-2 font-medium">{contract.client_username || '—'}</p></CardContent></Card>
        <Card className="rounded-3xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Freelancer</p><p className="mt-2 font-medium">{contract.freelancer_username || '—'}</p></CardContent></Card>
        <Card className="rounded-3xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Remaining amount</p><p className="mt-2 font-medium">{money(contract.remaining_amount ?? 0)} DZD</p></CardContent></Card>
        <Card className="rounded-3xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Next step</p><p className="mt-2 font-medium">{normalizeStatus(nextAction).replaceAll('_', ' ') || '—'}</p></CardContent></Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {isClientParty && acceptedProposal ? (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>{copy.acceptedProposal}</CardTitle>
              <CardDescription>This is the proposal that locked the contract terms.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3">
                <UserIcon className="mt-1 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">{acceptedProposal.freelancer_username}</p>
                  <p className="text-sm text-muted-foreground">{acceptedProposal.cover_letter}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Bid price</p><p className="mt-1 font-semibold">{money(acceptedProposal.proposed_price)} DZD</p></div>
                <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Delivery</p><p className="mt-1 font-semibold">{acceptedProposal.delivery_days} days</p></div>
                <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Submitted</p><p className="mt-1 font-semibold">{new Date(acceptedProposal.created_at).toLocaleDateString()}</p></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>{copy.contractBrief}</CardTitle>
              <CardDescription>The contract overview and workspace context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border p-4">
                <p className="text-sm font-medium">Project</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {contract.job_title || contract.source_label || contract.title || `Contract #${contract.public_id}`}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Budget</p><p className="mt-1 font-semibold">{money(contract.agreed_price)} DZD</p></div>
                <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Deadline</p><p className="mt-1 font-semibold">{new Date(contract.deadline).toLocaleDateString()}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{copy.milestones}</CardTitle>
              <CardDescription>Milestone flow, funding state, submissions, approvals, and disputes.</CardDescription>
            </div>

            {isClientParty && !hasSuspension && !isFundingLocked ? (
              <Button onClick={() => setMilestoneDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {copy.addMilestone}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-sm font-medium">Workspace state</p>
              <p className="text-sm text-muted-foreground">{currentActionMessage}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Milestone timeline</CardTitle>
          <CardDescription>This is the live contract journey. Use the milestone actions beside each item.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContractActivityTimeline
            contract={contract}
            viewerRole={viewerRole}
            busyMilestonePublicId={state.actionMilestonePublicId}
            onFund={(milestonePublicId) => void fundMilestone(milestonePublicId)}
            onRetry={(milestonePublicId) => void retryFunding(milestonePublicId)}
            onContinue={(checkoutUrl) => { window.location.href = checkoutUrl }}
            onSubmit={(milestone) => setSubmitDialogMilestone(milestone)}
            onApprove={(milestonePublicId) => void approveMilestone(milestonePublicId)}
            onRequestRevision={(milestone) => setRevisionDialogMilestone(milestone)}
            onDispute={(milestonePublicId) => void disputeMilestone(milestonePublicId)}
          />
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>{copy.summary}</CardTitle>
          <CardDescription>Useful numbers at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Milestones</p><p className="mt-1 text-lg font-semibold">{milestones.length}</p></div>
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Funded</p><p className="mt-1 text-lg font-semibold">{milestones.filter((milestone) => normalizeStatus(milestone.status) === 'funded').length}</p></div>
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Submitted</p><p className="mt-1 text-lg font-semibold">{milestones.filter((milestone) => normalizeStatus(milestone.status) === 'submitted').length}</p></div>
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Released</p><p className="mt-1 text-lg font-semibold">{milestones.filter((milestone) => normalizeStatus(milestone.status) === 'released').length}</p></div>
        </CardContent>
      </Card>

      <CreateMilestoneDialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen} contractPublicId={contract.public_id} onCreated={reloadContract} />
      <SubmitWorkDialog open={Boolean(submitDialogMilestone)} onOpenChange={(open) => !open && setSubmitDialogMilestone(null)} milestonePublicId={submitDialogMilestone?.public_id || ''} onSubmitted={() => { setSubmitDialogMilestone(null); void reloadContract() }} />
      <RequestRevisionDialog open={Boolean(revisionDialogMilestone)} onOpenChange={(open) => !open && setRevisionDialogMilestone(null)} milestonePublicId={revisionDialogMilestone?.public_id || ''} onRequested={() => { setRevisionDialogMilestone(null); void reloadContract() }} />

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Review contract</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>Open the reviews area to leave feedback for this contract.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
