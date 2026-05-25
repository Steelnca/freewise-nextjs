
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRightIcon, WalletIcon, ReceiptTextIcon, ShieldIcon, SendIcon } from 'lucide-react'

import { payments } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { EscrowHold, Payout, Wallet, WalletTransaction } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function PaymentsPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [escrow, setEscrow] = useState<EscrowHold[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      try {
        const [walletRes, txRes, escrowRes, payoutRes] = await Promise.all([
          payments.wallet(),
          payments.transactions(),
          payments.escrow(),
          payments.payouts(),
        ])

        if (!mounted) return

        setWallet(walletRes.data)
        setTransactions(txRes.data.slice(0, 6))
        setEscrow(escrowRes.data.slice(0, 4))
        setPayouts(payoutRes.data.slice(0, 4))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const currency = wallet?.currency ?? 'DZD'

  const stats = useMemo(() => [
    {
      label: 'Available',
      value: wallet ? `${Number(wallet.available_balance).toLocaleString('fr-DZ')} ${currency}` : '—',
      icon: WalletIcon,
      tone: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'In escrow',
      value: wallet ? `${Number(wallet.escrow_balance).toLocaleString('fr-DZ')} ${currency}` : '—',
      icon: ShieldIcon,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Recent tx',
      value: transactions.length.toString(),
      icon: ReceiptTextIcon,
      tone: 'text-purple-600 bg-purple-50',
    },
  ], [wallet, currency, transactions.length])

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Your wallet, escrow, and payout activity in one place.
          </p>
        </div>

        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href={ROUTES.dashboard.payments.transactions}>
              View ledger
            </Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.dashboard.payments.payouts}>
              Request payout
            </Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold">{loading ? '—' : value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Latest wallet movements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              transactions.map((tx, index) => (
                <div key={tx.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium capitalize">{tx.transaction_type.replaceAll('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {Number(tx.amount).toLocaleString('fr-DZ')} {tx.currency}
                      </p>
                      <p className="text-sm text-muted-foreground uppercase">{tx.status}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Escrow & payouts</CardTitle>
            <CardDescription>Open holds and recent withdrawals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-medium">Escrow holds</p>
              {escrow.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active escrow holds.</p>
              ) : (
                <div className="space-y-3">
                  {escrow.map((hold) => (
                    <div key={hold.id} className="flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <p className="font-medium">{hold.contract_reference}</p>
                        <p className="text-sm text-muted-foreground uppercase">{hold.status}</p>
                      </div>
                      <p className="font-medium">
                        {Number(hold.amount).toLocaleString('fr-DZ')} {hold.currency}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <p className="mb-3 text-sm font-medium">Recent payouts</p>
              {payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payouts yet.</p>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <p className="font-medium">{payout.destination_label || 'Payout'}</p>
                        <p className="text-sm text-muted-foreground uppercase">{payout.status}</p>
                      </div>
                      <p className="font-medium">
                        {Number(payout.amount).toLocaleString('fr-DZ')} {payout.currency}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Need a deeper look?</h2>
            <p className="text-sm text-muted-foreground">
              Open the full ledger or request a payout from your dashboard wallet.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href={ROUTES.dashboard.payments.transactions}>Open ledger</Link>
            </Button>
            <Button asChild>
              <Link href={ROUTES.dashboard.payments.payouts}>
                <SendIcon className="mr-2 h-4 w-4" />
                Request payout
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}