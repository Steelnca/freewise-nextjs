'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { proposals as proposalsApi } from '@/lib/api'
import type { Proposal } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClockIcon, CalendarIcon, ArrowRightIcon } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  ACCEPTED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-600',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
}

export default function ProposalsPage() {
  const { mode } = useMode()
  const { t }    = useLocale()
  const [myProposals, setMyProposals] = useState<Proposal[]>([])
  const [loading,     setLoading]     = useState(true)
  const [withdrawing, setWithdrawing] = useState<number | null>(null)

  useEffect(() => {
    proposalsApi.mine().then(r => setMyProposals(r.data)).finally(() => setLoading(false))
  }, [])

  if (mode !== 'freelancer') {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Switch to Freelancer mode to view your proposals.</p>
        <Button variant="outline" asChild><Link href="/dashboard">Back</Link></Button>
      </div>
    )
  }

  const handleWithdraw = async (id: number) => {
    setWithdrawing(id)
    try {
      await proposalsApi.withdraw(id)
      setMyProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'WITHDRAWN' as const } : p))
      toast.success('Proposal withdrawn.')
    } catch { toast.error('Failed to withdraw.') }
    finally { setWithdrawing(null) }
  }

  const groups = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Proposals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your bids on client job posts
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : myProposals.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <p className="text-muted-foreground">No proposals submitted yet.</p>
            <Button asChild><Link href="/dashboard/jobs">Browse Jobs</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(status => {
            const group = myProposals.filter(p => p.status === status)
            if (!group.length) return null
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[status]}`}>
                    {status}
                  </span>
                  <span className="text-sm text-muted-foreground">{group.length}</span>
                </div>
                <div className="space-y-3">
                  {group.map(proposal => (
                    <Card key={proposal.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <p className="text-base font-semibold truncate">{proposal.job_title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{proposal.cover_letter}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="font-medium text-foreground">
                                {parseFloat(proposal.proposed_price).toLocaleString('fr-DZ')} DZD
                              </span>
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />{proposal.delivery_days} {t.common.days}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(proposal.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {status === 'ACCEPTED' && (
                              <Button size="sm" asChild>
                                <Link href="/dashboard/contracts">Contract <ArrowRightIcon className="w-3 h-3 ml-1" /></Link>
                              </Button>
                            )}
                            {status === 'PENDING' && (
                              <Button size="sm" variant="outline" disabled={withdrawing === proposal.id} onClick={() => handleWithdraw(proposal.id)}>
                                {withdrawing === proposal.id ? t.common.loading : 'Withdraw'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
