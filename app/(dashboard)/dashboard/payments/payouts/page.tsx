
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeftIcon, SendIcon } from 'lucide-react'

import { payments } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Payout } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function PayoutsPage() {
  const [amount, setAmount] = useState('')
  const [destinationLabel, setDestinationLabel] = useState('')
  const [destinationType, setDestinationType] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Payout[]>([])

  const refreshPayouts = async () => {
    const res = await payments.payouts()
    setItems(res.data)
  }

  useEffect(() => {
    refreshPayouts().catch(() => void 0)
  }, [])

  const canSubmit = useMemo(() => Number(amount) > 0, [amount])

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    try {
      const res = await payments.requestPayout({
        amount,
        idempotency_key: crypto.randomUUID(),
        destination_label: destinationLabel,
        destination_type: destinationType,
        description,
      })

      toast.success('Payout request created.')
      setAmount('')
      setDestinationLabel('')
      setDestinationType('')
      setDescription('')
      setItems((prev) => [res.data, ...prev])
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create payout request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Button asChild variant="ghost" className="-ml-2 mb-2">
          <Link href={ROUTES.dashboard.payments.root}>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Request withdrawals and follow their status.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Request payout</CardTitle>
            <CardDescription>Use the wallet balance you already earned.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinationType">Destination type</Label>
                <Input id="destinationType" value={destinationType} onChange={(e) => setDestinationType(e.target.value)} placeholder="bank_account / phone / wallet" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinationLabel">Destination label</Label>
                <Input id="destinationLabel" value={destinationLabel} onChange={(e) => setDestinationLabel(e.target.value)} placeholder="My bank card" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Note</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional internal note" />
              </div>

              <Button type="submit" disabled={loading || !canSubmit} className="w-full">
                <SendIcon className="mr-2 h-4 w-4" />
                {loading ? 'Submitting...' : 'Request payout'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Recent payout requests</CardTitle>
            <CardDescription>Track every payout from here.</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payouts yet.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.public_id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.destination_label || 'Payout'}</p>
                        <p className="text-sm text-muted-foreground uppercase">{item.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {Number(item.amount).toLocaleString('fr-DZ')} {item.currency}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}