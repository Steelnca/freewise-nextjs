
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { jobs as jobsApi, contracts as contractsApi, payments } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import type { Job, Contract, EscrowTransaction } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  BriefcaseIcon, FileTextIcon, ShieldCheckIcon,
  PlusIcon, ArrowRightIcon, ClockIcon,
} from 'lucide-react'

const statusColors: Record<string, string> = {
  OPEN:        'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED:   'bg-gray-100 text-gray-600',
  CANCELLED:   'bg-red-100 text-red-600',
}

const contractColors: Record<string, string> = {
  ACTIVE:    'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DISPUTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export default function ClientDashboard() {
  const { t } = useLocale()
  const [myJobs,     setMyJobs]     = useState<Job[]>([])
  const [myContracts,setMyContracts]= useState<Contract[]>([])
  const [escrow,     setEscrow]     = useState<EscrowTransaction[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      jobsApi.mine(),
      contractsApi.list(),
      payments.escrow(),
    ]).then(([j, c, e]) => {
      setMyJobs(j.data.slice(0, 5))
      setMyContracts(c.data.slice(0, 5))
      setEscrow(e.data)
    }).finally(() => setLoading(false))
  }, [])

  const totalEscrowed = escrow
    .filter(e => e.status === 'HELD')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)

  const stats = [
    {
      label: 'Active Jobs',
      value: myJobs.filter(j => j.status === 'OPEN').length,
      icon:  BriefcaseIcon,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Active Contracts',
      value: myContracts.filter(c => c.status === 'ACTIVE').length,
      icon:  FileTextIcon,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'In Escrow (DZD)',
      value: totalEscrowed.toLocaleString('fr-DZ'),
      icon:  ShieldCheckIcon,
      color: 'text-green-600 bg-green-50',
    },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your jobs and contracts</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/client/post-job">
            <PlusIcon className="w-4 h-4 mr-2" /> {t.jobs.post}
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Jobs</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/client/jobs">
                View all <ArrowRightIcon className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t.common.loading}</p>
            ) : myJobs.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">{t.jobs.noJobs}</p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/client/post-job">Post your first job</Link>
                </Button>
              </div>
            ) : myJobs.map((job, i) => (
              <div key={job.id}>
                {i > 0 && <Separator />}
                <Link href={`/jobs/${job.id}`} className="block py-2 hover:opacity-80 transition-opacity">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <ClockIcon className="w-3 h-3" />
                        {new Date(job.created_at).toLocaleDateString()}
                        · {job.offer_count} {t.jobs.offers}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColors[job.status]}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
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
            ) : myContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No active contracts yet.</p>
            ) : myContracts.map((contract, i) => (
              <div key={contract.id}>
                {i > 0 && <Separator />}
                <Link href={`/dashboard/contracts/${contract.id}`} className="block py-2 hover:opacity-80 transition-opacity">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contract.job_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        with {contract.freelancer_username} · {parseFloat(contract.agreed_price).toLocaleString('fr-DZ')} DZD
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${contractColors[contract.status]}`}>
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