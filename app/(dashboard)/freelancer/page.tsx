
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { freelancers as freelancersApi, offers as offersApi, contracts as contractsApi } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import type { FreelancerProfile, Offer, Contract } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  BriefcaseIcon, StarIcon, WalletIcon,
  ArrowRightIcon, ClockIcon, CheckCircleIcon,
} from 'lucide-react'

const offerStatusColors: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  ACCEPTED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-600',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
}

export default function FreelancerDashboard() {
  const { t } = useLocale()
  const [profile,   setProfile]   = useState<FreelancerProfile | null>(null)
  const [myOffers,  setMyOffers]  = useState<Offer[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      freelancersApi.me(),
      offersApi.mine(),
      contractsApi.list(),
    ]).then(([p, o, c]) => {
      setProfile(p.data)
      setMyOffers(o.data.slice(0, 5))
      setContracts(c.data.slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  const stats = [
    {
      label: 'Completed Jobs',
      value: profile?.completed_jobs ?? 0,
      icon:  CheckCircleIcon,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Rating',
      value: profile ? `${parseFloat(profile.rating).toFixed(1)} ★` : '—',
      icon:  StarIcon,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Total Earned (DZD)',
      value: profile ? parseFloat(profile.total_earned).toLocaleString('fr-DZ') : '0',
      icon:  WalletIcon,
      color: 'text-blue-600 bg-blue-50',
    },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Freelancer Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {profile?.availability === 'AVAILABLE'
              ? '🟢 Available for work'
              : profile?.availability === 'BUSY'
              ? '🟡 Currently busy'
              : '🔴 Not available'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/freelancer/jobs">
            <BriefcaseIcon className="w-4 h-4 mr-2" /> Browse Jobs
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? '—' : value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Profile completion nudge */}
      {profile && !profile.title && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800">
              Complete your profile to attract more clients and get hired faster.
            </p>
            <Button size="sm" variant="outline" asChild className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100">
              <Link href="/dashboard/freelancer/profile">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Offers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Offers</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/freelancer/offers">
                View all <ArrowRightIcon className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t.common.loading}</p>
            ) : myOffers.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">No offers submitted yet.</p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/freelancer/jobs">Browse Jobs</Link>
                </Button>
              </div>
            ) : myOffers.map((offer, i) => (
              <div key={offer.id}>
                {i > 0 && <Separator />}
                <div className="py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{offer.job_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {parseFloat(offer.proposed_price).toLocaleString('fr-DZ')} DZD · {offer.delivery_days} {t.common.days}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${offerStatusColors[offer.status]}`}>
                      {t.offers.status[offer.status.toLowerCase() as keyof typeof t.offers.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Contracts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Active Contracts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/contracts">
                View all <ArrowRightIcon className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t.common.loading}</p>
            ) : contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No active contracts yet.</p>
            ) : contracts.map((contract, i) => (
              <div key={contract.id}>
                {i > 0 && <Separator />}
                <Link href={`/dashboard/contracts/${contract.id}`} className="block py-2 hover:opacity-80 transition-opacity">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contract.job_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        with {contract.client_username} · {parseFloat(contract.agreed_price).toLocaleString('fr-DZ')} DZD
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      contract.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {contract.status}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}