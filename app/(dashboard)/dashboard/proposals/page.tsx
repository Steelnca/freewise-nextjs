'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { offers as offersApi } from '@/lib/api'
import type { Offer } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ClockIcon, CalendarIcon, ArrowRightIcon } from 'lucide-react'

const STATUS_STYLES: Record<string, { bg: string }> = {
  PENDING:   { bg: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED:  { bg: 'bg-green-100 text-green-700'   },
  REJECTED:  { bg: 'bg-red-100 text-red-600'       },
  WITHDRAWN: { bg: 'bg-gray-100 text-gray-600'     },
}

export default function OffersPage() {
  const { mode } = useMode()
  const { t }    = useLocale()
  const [myOffers,    setMyOffers]    = useState<Offer[]>([])
  const [loading,     setLoading]     = useState(true)
  const [withdrawing, setWithdrawing] = useState<number | null>(null)

  useEffect(() => {
    offersApi.mine().then(r => setMyOffers(r.data)).finally(() => setLoading(false))
  }, [])

  if (mode !== 'freelancer') {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Switch to Freelancer mode to view your offers.</p>
        <Button variant="outline" asChild><Link href="/dashboard">Back</Link></Button>
      </div>
    )
  }

  const handleWithdraw = async (id: number) => {
    setWithdrawing(id)
    try {
      await offersApi.withdraw(id)
      setMyOffers(prev => prev.map(o => o.id === id ? { ...o, status: 'WITHDRAWN' as const } : o))
      toast.success('Offer withdrawn.')
    } catch { toast.error('Failed to withdraw.') }
    finally { setWithdrawing(null) }
  }

  const groups = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.offers.myOffers}</h1>
        <p className="text-muted-foreground text-sm mt-1">{myOffers.length} offers submitted</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : myOffers.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <p className="text-muted-foreground">No offers yet.</p>
            <Button asChild><Link href="/dashboard/jobs">Browse Jobs</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(status => {
            const group = myOffers.filter(o => o.status === status)
            if (!group.length) return null
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[status].bg}`}>
                    {t.offers.status[status.toLowerCase() as keyof typeof t.offers.status]}
                  </span>
                  <span className="text-sm text-muted-foreground">{group.length}</span>
                </div>
                <div className="space-y-3">
                  {group.map(offer => (
                    <Card key={offer.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <p className="text-base font-semibold truncate">{offer.job_title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{offer.cover_letter}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="font-medium text-foreground">
                                {parseFloat(offer.proposed_price).toLocaleString('fr-DZ')} DZD
                              </span>
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />{offer.delivery_days} {t.common.days}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(offer.created_at).toLocaleDateString()}
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
                              <Button size="sm" variant="outline" disabled={withdrawing === offer.id} onClick={() => handleWithdraw(offer.id)}>
                                {withdrawing === offer.id ? t.common.loading : t.offers.withdraw}
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