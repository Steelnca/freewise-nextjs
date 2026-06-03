
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckCircle2Icon, Clock3Icon, Loader2Icon, RotateCcwIcon, XCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { payments } from '@/lib/api'
import { PaymentAttemptStatusResponse } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  variant: 'success' | 'failed'
  attemptId: string | null
  milestoneId: string | null
  contractId: string | null
}

const statusLabelMap: Record<string, string> = {
  CREATED: 'Created',
  REDIRECTED: 'Redirected',
  PENDING_PROVIDER: 'Waiting for provider',
  PROCESSING: 'Processing',
  PAID_PROVIDER_NOT_SETTLED: 'Paid, confirming',
  RECONCILED: 'Reconciled',
  SETTLED: 'Settled',
  FAILED: 'Failed',
  CANCELED: 'Canceled',
  EXPIRED: 'Expired',
}

function statusTone(status?: string) {
  switch (status) {
    case 'SETTLED':
      return 'bg-green-100 text-green-700'
    case 'FAILED':
    case 'CANCELED':
    case 'EXPIRED':
      return 'bg-red-100 text-red-700'
    case 'PAID_PROVIDER_NOT_SETTLED':
    case 'PROCESSING':
    case 'PENDING_PROVIDER':
    case 'RECONCILED':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function PaymentAttemptStatusPanel({
  variant,
  attemptId,
  milestoneId,
  contractId,
}: Props) {
  const router = useRouter()
  const [attempt, setAttempt] = useState<PaymentAttemptStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const loadStatus = async (silent = false) => {
    if (!attemptId) return

    if (silent) setRefreshing(true)
    else setLoading(true)

    try {
      const { data } = await payments.attemptStatus(attemptId)
      setAttempt(data)
      setError(null)

      if (data.is_final) {
        stopPolling()
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load payment status.')
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    if (!attemptId) {
      setError('Missing payment attempt reference.')
      setLoading(false)
      return
    }

    void loadStatus(false)

    pollRef.current = window.setInterval(() => {
      void loadStatus(true)
    }, 3000)

    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  useEffect(() => {
    if (attempt?.internal_status === 'SETTLED' && contractId) {
      const timer = window.setTimeout(() => {
        router.push(`/dashboard/contracts/${contractId}`)
      }, 1500)

      return () => window.clearTimeout(timer)
    }
  }, [attempt?.internal_status, contractId, router])

  const retryable = attempt?.retryable ?? false
  const humanStatus = useMemo(() => {
    if (!attempt) return 'Checking status'
    return statusLabelMap[attempt.internal_status] || attempt.internal_status
  }, [attempt])

  const mainCopy = useMemo(() => {
    if (!attempt) {
      return variant === 'success'
        ? 'We are checking whether the payment was recorded.'
        : 'We are checking whether the payment attempt failed or is still pending.'
    }

    switch (attempt.internal_status) {
      case 'SETTLED':
        return 'Payment confirmed. Freewise has recorded the funding and moved it through escrow.'
      case 'PAID_PROVIDER_NOT_SETTLED':
      case 'PROCESSING':
      case 'PENDING_PROVIDER':
      case 'REDIRECTED':
      case 'CREATED':
      case 'RECONCILED':
        return 'Payment is still being confirmed. This usually finishes automatically.'
      case 'FAILED':
      case 'CANCELED':
      case 'EXPIRED':
        return attempt.failure_reason || 'This attempt did not complete.'
      default:
        return 'We are still checking this attempt.'
    }
  }, [attempt, variant])

  const handleRetry = async () => {
    if (!milestoneId) {
      toast.error('Missing milestone reference.')
      return
    }

    setRetrying(true)
    try {
      const { data } = await payments.fundMilestone(Number(milestoneId))
      window.location.assign(data.checkout_url)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create a new checkout.')
    } finally {
      setRetrying(false)
    }
  }

  const backHref = contractId ? `/dashboard/contracts/${contractId}` : '/dashboard/contracts'

  if (loading && !attempt) {
    return (
      <Card className="rounded-3xl">
        <CardHeader>
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-10 w-40 rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge className={statusTone(attempt?.internal_status)}>
            {attempt ? humanStatus : 'Checking'}
          </Badge>
          {refreshing ? <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        <CardTitle>
          {variant === 'success' ? 'Payment success' : 'Payment status'}
        </CardTitle>

        <CardDescription>{mainCopy}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {attempt ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground">Milestone</p>
              <p className="mt-1 font-medium">#{attempt.milestone_id}</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="mt-1 font-medium">
                {attempt.amount} {attempt.currency}
              </p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground">Provider</p>
              <p className="mt-1 font-medium">{attempt.provider}</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground">Provider status</p>
              <p className="mt-1 font-medium">{attempt.provider_status || '—'}</p>
            </div>
          </div>
        ) : null}

        {attempt?.failure_reason ? (
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            {attempt.failure_reason}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {retryable ? (
            <Button onClick={handleRetry} disabled={retrying}>
              {retrying ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Creating new checkout...
                </>
              ) : (
                <>
                  <RotateCcwIcon className="mr-2 h-4 w-4" />
                  Try again
                </>
              )}
            </Button>
          ) : null}

          {attempt?.internal_status === 'SETTLED' ? (
            <Button onClick={() => router.push(backHref)}>
              <CheckCircle2Icon className="mr-2 h-4 w-4" />
              Continue
            </Button>
          ) : (
            <Button variant="outline" onClick={() => router.push(backHref)}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to contract
            </Button>
          )}
        </div>

        {!attempt?.is_final ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3Icon className="h-4 w-4" />
            We are polling Freewise every few seconds until the final status is known.
          </div>
        ) : null}

        {attempt?.internal_status === 'SETTLED' ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2Icon className="h-4 w-4" />
            Funds are secured in Freewise escrow.
          </div>
        ) : null}

        {retryable ? (
          <div className="flex items-center gap-2 text-sm text-red-700">
            <XCircleIcon className="h-4 w-4" />
            This attempt can be retried with a fresh checkout.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}