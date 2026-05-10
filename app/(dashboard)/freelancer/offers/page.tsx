
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { offers as offersApi } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import type { Offer } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CalendarIcon, ClockIcon, ArrowRightIcon } from 'lucide-react'

const statusStyles: Record<string, { bg: string; label: string }> = {
  PENDING:   { bg: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  ACCEPTED:  { bg: 'bg-green-100 text-green-700',   label: 'Accepted' },
  REJECTED:  { bg: 'bg-red-100 text-red-600',       label: 'Rejected' },
  WITHDRAWN: { bg: 'bg-gray-100 text-gray-600',     label: 'Withdrawn' },
}

export default function MyOffersPage() {
  const { t } = useLocale()
  const [myOffers, setMyOffers] = useState<Offer[]>([])
  const [loading,  setLoading]  = useState(true)
  const [withdrawing, setWithdrawing] = useState<number | null>(null)

  useEffect(() => {
    offersApi.mine()
      .then(r => setMyOffers(r.data))
      .finally(() => setLoading(false))
  }, [])

  const handleWithdraw = async (offerId: number) => {
    setWithdrawing(offerId)
    try {
      await offersApi.withdraw(offerId)
      setMyOffers(prev =>
        prev.map(o => o.id === offerId ? { ...o, status: 'WITHDRAWN' } : o)
      )
      toast.success('Offer withdrawn.')
    } catch {
      toast.error('Failed to withdraw offer.')
    } finally {
      setWithdrawing(null)
    }
  }

  const groups = {
    PENDING:   myOffers.filter(o => o.status === 'PENDING'),
    ACCEPTED:  myOffers.filter(o => o.status === 'ACCEPTED'),
    REJECTED:  myOffers.filter(o => o.status === 'REJECTED'),
    WITHDRAWN: myOffers.filter(o => o.status === 'WITHDRAWN'),
  }

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
            <p className="text-muted-foreground">You haven't submitted any offers yet.</p>
            <Button asChild>
              <Link href="/dashboard/freelancer/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([status, groupOffers]) => {
            if (groupOffers.length === 0) return null
            const style = statusStyles[status]
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${style.bg}`}>
                    {style.label}
                  </span>
                  <span className="text-sm text-muted-foreground">{groupOffers.length}</span>
                </div>

                <div className="space-y-3">
                  {groupOffers.map(offer => (
                    <Card key={offer.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <Link
                              href={`/jobs/${offer.job}`}
                              className="text-base font-semibold hover:underline block truncate"
                            >
                              {offer.job_title}
                            </Link>

                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {offer.cover_letter}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="font-medium text-foreground">
                                {parseFloat(offer.proposed_price).toLocaleString('fr-DZ')} DZD
                              </span>
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {offer.delivery_days} {t.common.days}
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
                                <Link href="/dashboard/contracts">
                                  View Contract <ArrowRightIcon className="w-3 h-3 ml-1" />
                                </Link>
                              </Button>
                            )}
                            {status === 'PENDING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={withdrawing === offer.id}
                                onClick={() => handleWithdraw(offer.id)}
                              >
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