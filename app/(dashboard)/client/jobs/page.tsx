'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { jobs as jobsApi, offers as offersApi } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import type { Job } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PlusIcon, UsersIcon, CalendarIcon, ArrowRightIcon } from 'lucide-react'

const statusColors: Record<string, string> = {
  OPEN:        'default',
  IN_PROGRESS: 'secondary',
  COMPLETED:   'outline',
  CANCELLED:   'destructive',
} as const

export default function ClientJobsPage() {
  const { t } = useLocale()
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobsApi.mine()
      .then(r => setMyJobs(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">{myJobs.length} jobs posted</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/client/post-job">
            <PlusIcon className="w-4 h-4 mr-2" /> {t.jobs.post}
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : myJobs.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <p className="text-muted-foreground">{t.jobs.noJobs}</p>
            <Button asChild>
              <Link href="/dashboard/client/post-job">Post your first job</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myJobs.map(job => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-base font-semibold hover:underline"
                      >
                        {job.title}
                      </Link>
                      <Badge variant={statusColors[job.status] as any}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <UsersIcon className="w-3 h-3" />
                        {job.offer_count} {t.jobs.offers}
                      </span>
                      {job.deadline && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {(job.budget_min || job.budget_max) && (
                        <span>
                          {job.budget_min && `${parseFloat(job.budget_min).toLocaleString('fr-DZ')} DZD`}
                          {job.budget_min && job.budget_max && ' – '}
                          {job.budget_max && `${parseFloat(job.budget_max).toLocaleString('fr-DZ')} DZD`}
                        </span>
                      )}
                      {job.category && (
                        <span className="bg-muted px-2 py-0.5 rounded-full">
                          {job.category.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {job.status === 'OPEN' && job.offer_count > 0 && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/jobs/${job.id}/offers`}>
                        View offers <ArrowRightIcon className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}