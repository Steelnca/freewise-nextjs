
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowLeftIcon, ReceiptTextIcon } from 'lucide-react'

import { payments } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { WalletTransaction } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function PaymentsTransactionsPage() {
  const [items, setItems] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      try {
        const res = await payments.transactions()
        if (!mounted) return
        setItems(res.data)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="-ml-2 mb-2">
            <Link href={ROUTES.dashboard.payments.root}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Every movement of money in your wallet is recorded here. This includes deposits, payments, payouts, and refunds.
          </p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <CardDescription> Immutable records for wallet, escrow, payout, and refund events. </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <ReceiptTextIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm text-muted-foreground">Once payments start moving, they will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((tx, index) => (
                <motion.div key={tx.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {index > 0 && <Separator className="mb-4" />}
                  <div className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium capitalize">{tx.transaction_type.replaceAll('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">{tx.description || 'No description'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()} · {tx.reference_type || '—'} {tx.reference_id ? `#${tx.reference_id}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-medium">
                        {Number(tx.amount).toLocaleString('fr-DZ')} {tx.currency}
                      </p>
                      <p className="text-sm text-muted-foreground uppercase">{tx.status}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Number(tx.balance_before).toLocaleString('fr-DZ')} → {Number(tx.balance_after).toLocaleString('fr-DZ')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}