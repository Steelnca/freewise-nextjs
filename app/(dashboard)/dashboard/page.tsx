'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { jobs as jobsApi, offers as offersApi, contracts as contractsApi, payments, freelancers as freelancersApi } from '@/lib/api'
import type { Job, Offer, Contract, FreelancerProfile } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  BriefcaseIcon, FileTextIcon, ShieldCheckIcon,
  PlusIcon, ArrowRightIcon, ClockIcon,
  CheckCircleIcon, StarIcon, WalletIcon,
} from 'lucide-react'

// ── Status color helpers ──────────────────────────────────────────────────────

const jobStatusCls: Record<string, string> = {
  OPEN:        'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED:   'bg-gray-100 text-gray-600',
  CANCELLED:   'bg-red-100 text-red-600',
}

const offerStatusCls: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  ACCEPTED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-600',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
}

const contractStatusCls: Record<string, string> = {
  ACTIVE:    'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DISPUTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { mode, account } = useMode()
  const { t } = useLocale()

  const [myJobs,      setMyJobs]      = useState<Job[]>([])
  const [myOffers,    setMyOffers]    = useState<Offer[]>([])
  const [myContracts, setMyContracts] = useState<Contract[]>([])
  const [profile,     setProfile]     = useState<FreelancerProfile | null>(null)
  const [escrowed,    setEscrowed]    = useState(0)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!account) return
    setLoading(true)

    if (mode === 'client') {
      Promise.all([jobsApi.mine(), contractsApi.list(), payments.escrow()])
        .then(([j, c, e]) => {
          setMyJobs(j.data.slice(0, 5))
          setMyContracts(c.data.slice(0, 5))
          setEscrowed(
            e.data
              .filter(x => x.status === 'HELD')
              .reduce((s, x) => s + parseFloat(x.amount), 0)
          )
        }).finally(() => setLoading(false))
    } else {
      Promise.all([freelancersApi.me(), offersApi.mine(), contractsApi.list()])
        .then(([p, o, c]) => {
          setProfile(p.data)
          setMyOffers(o.data.slice(0, 5))
          setMyContracts(c.data.slice(0, 5))
        }).finally(() => setLoading(false))
    }
  }, [mode, account])

  // ── No role yet ────────────────────────────────────────────────────────────

  if (account && !account.is_client && !account.is_freelancer) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold">{t.dashboard.noRole}</h2>
          <p className="text-muted-foreground text-sm">{t.dashboard.chooseRole}</p>
          <div className="flex gap-3 justify-center">
            <Button asChild><Link href="/dashboard/activate">Get Started</Link></Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Client overview ────────────────────────────────────────────────────────

  if (mode === 'client') {
    const stats = [
      { label: 'Open Jobs',        value: myJobs.filter(j => j.status === 'OPEN').length,        icon: BriefcaseIcon,    color: 'text-blue-600 bg-blue-50' },
      { label: 'Active Contracts', value: myContracts.filter(c => c.status === 'ACTIVE').length, icon: FileTextIcon,     color: 'text-purple-600 bg-purple-50' },
      { label: 'In Escrow (DZD)',  value: escrowed.toLocaleString('fr-DZ'),                       icon: ShieldCheckIcon,  color: 'text-green-600 bg-green-50' },
    ]

    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {account ? t.dashboard.welcome.replace('{name}', account.username) : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Client overview</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/post"><PlusIcon className="w-4 h-4 mr-2" />{t.jobs.post}</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
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

        <div className="grid lg:grid-cols-2 gap-6">
          <RecentList
            title="Recent Jobs"
            viewAllHref="/dashboard/jobs"
            empty={{ text: 'No jobs posted yet.', action: { label: t.jobs.post, href: '/dashboard/post' } }}
            loading={loading}
          >
            {myJobs.map((job, i) => (
              <ListRow key={job.id} index={i} href={`/dashboard/jobs`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {new Date(job.created_at).toLocaleDateString()} · {job.offer_count} {t.jobs.offers}
                  </p>
                </div>
                <StatusBadge label={job.status.replace('_', ' ')} cls={jobStatusCls[job.status]} />
              </ListRow>
            ))}
          </RecentList>

          <RecentList
            title="Active Contracts"
            viewAllHref="/dashboard/contracts"
            empty={{ text: 'No contracts yet.' }}
            loading={loading}
          >
            {myContracts.map((c, i) => (
              <ListRow key={c.id} index={i} href={`/dashboard/contracts`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.job_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    with {c.freelancer_username} · {parseFloat(c.agreed_price).toLocaleString('fr-DZ')} DZD
                  </p>
                </div>
                <StatusBadge label={c.status} cls={contractStatusCls[c.status]} />
              </ListRow>
            ))}
          </RecentList>
        </div>
      </div>
    )
  }

  // ── Freelancer overview ────────────────────────────────────────────────────

  const stats = [
    { label: 'Completed Jobs', value: profile?.completed_jobs ?? 0,                                    icon: CheckCircleIcon, color: 'text-green-600 bg-green-50' },
    { label: 'Rating',         value: profile ? `${parseFloat(profile.rating).toFixed(1)} ★` : '—',   icon: StarIcon,        color: 'text-amber-600 bg-amber-50' },
    { label: 'Earned (DZD)',   value: profile ? parseFloat(profile.total_earned).toLocaleString('fr-DZ') : '0', icon: WalletIcon, color: 'text-blue-600 bg-blue-50' },
  ]

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {account ? t.dashboard.welcome.replace('{name}', account.username) : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {profile?.availability === 'AVAILABLE' ? '🟢 Available' : profile?.availability === 'BUSY' ? '🟡 Busy' : '🔴 Unavailable'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs"><BriefcaseIcon className="w-4 h-4 mr-2" />Browse Jobs</Link>
        </Button>
      </div>

      {profile && !profile.title && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800">Complete your profile to attract more clients.</p>
            <Button size="sm" variant="outline" className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100" asChild>
              <Link href="/dashboard/profile">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
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

      <div className="grid lg:grid-cols-2 gap-6">
        <RecentList
          title="Recent Offers"
          viewAllHref="/dashboard/offers"
          empty={{ text: 'No offers yet.', action: { label: 'Browse Jobs', href: '/dashboard/jobs' } }}
          loading={loading}
        >
          {myOffers.map((offer, i) => (
            <ListRow key={offer.id} index={i}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{offer.job_title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {parseFloat(offer.proposed_price).toLocaleString('fr-DZ')} DZD · {offer.delivery_days} {t.common.days}
                </p>
              </div>
              <StatusBadge label={offer.status} cls={offerStatusCls[offer.status]} />
            </ListRow>
          ))}
        </RecentList>

        <RecentList
          title="Active Contracts"
          viewAllHref="/dashboard/contracts"
          empty={{ text: 'No contracts yet.' }}
          loading={loading}
        >
          {myContracts.map((c, i) => (
            <ListRow key={c.id} index={i} href="/dashboard/contracts">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.job_title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  with {c.client_username} · {parseFloat(c.agreed_price).toLocaleString('fr-DZ')} DZD
                </p>
              </div>
              <StatusBadge label={c.status} cls={contractStatusCls[c.status]} />
            </ListRow>
          ))}
        </RecentList>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RecentList({
  title, viewAllHref, empty, loading, children,
}: {
  title: string
  viewAllHref: string
  empty: { text: string; action?: { label: string; href: string } }
  loading: boolean
  children: React.ReactNode
}) {
  const childCount = Array.isArray(children) ? children.filter(Boolean).length : (children ? 1 : 0)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href={viewAllHref}>View all <ArrowRightIcon className="w-3 h-3 ml-1" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-0">
        {loading ? (
          <p className="text-sm text-muted-foreground py-2">Loading...</p>
        ) : childCount === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">{empty.text}</p>
            {empty.action && (
              <Button size="sm" asChild><Link href={empty.action.href}>{empty.action.label}</Link></Button>
            )}
          </div>
        ) : children}
      </CardContent>
    </Card>
  )
}

function ListRow({ children, href, index }: { children: React.ReactNode; href?: string; index: number }) {
  const inner = (
    <div className="flex items-start justify-between gap-2 py-2.5 hover:opacity-75 transition-opacity">
      {children}
    </div>
  )
  return (
    <>
      {index > 0 && <Separator />}
      {href ? <Link href={href}>{inner}</Link> : inner}
    </>
  )
}

function StatusBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cls}`}>
      {label}
    </span>
  )
}