
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useLocale } from '@/context/locale-context'
import { freelancers as freelancersApi } from '@/lib/api'
import type { FreelancerProfile } from '@/lib/types'
import Navbar from '@/components/layout/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SearchIcon, StarIcon, BriefcaseIcon, CheckCircleIcon } from 'lucide-react'
import Footer from '@/components/layout/Footer'

const AVAILABILITY_BADGE: Record<string, { cls: string; label: string }> = {
  AVAILABLE:   { cls: 'bg-green-100 text-green-700',  label: 'Available' },
  BUSY:        { cls: 'bg-yellow-100 text-yellow-700', label: 'Busy' },
  UNAVAILABLE: { cls: 'bg-gray-100 text-gray-600',    label: 'Unavailable' },
}

export default function FreelancersPage() {
  const { t } = useLocale()

  const [freelancers,   setFreelancers]   = useState<FreelancerProfile[]>([])
  const [search,        setSearch]        = useState('')
  const [availability,  setAvailability]  = useState('')
  const [loading,       setLoading]       = useState(true)

  const fetchFreelancers = () => {
    setLoading(true)
    freelancersApi.list({
      search:       search       || undefined,
      availability: availability || undefined,
    })
      .then(r => setFreelancers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFreelancers() }, [])

  useEffect(() => {
    const d = setTimeout(fetchFreelancers, 400)
    return () => clearTimeout(d)
  }, [search, availability])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white">
        <div className="container-fw py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
              🇩🇿 Algerian Talent
            </span>
            <h1 className="text-4xl md:text-5xl font-bold">{t.nav.findTalent}</h1>
            <p className="text-blue-200 text-lg">
              Browse talented Algerian freelancers ready to work on your project.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container-fw py-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, skill, or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={availability || 'all'} onValueChange={v => setAvailability(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Any availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any availability</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <main className="container-fw py-10 flex-1">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : freelancers.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <p className="text-2xl">🔍</p>
            <p className="text-muted-foreground">No freelancers found. Try a different search.</p>
            <Button variant="outline" onClick={() => { setSearch(''); setAvailability('') }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {freelancers.length} freelancer{freelancers.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {freelancers.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/freelancers/${f.slug}`}>
                    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-5 space-y-4">
                        {/* Avatar + name */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
                            {f.username[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate group-hover:text-blue-600 transition-colors">
                              {f.username}
                            </p>
                            {f.title && (
                              <p className="text-xs text-muted-foreground truncate">{f.title}</p>
                            )}
                          </div>
                        </div>

                        {/* Availability */}
                        {(() => {
                          const badge = AVAILABILITY_BADGE[f.availability] ?? AVAILABILITY_BADGE.UNAVAILABLE
                          return (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${badge.cls}`}>
                              {badge.label}
                            </span>
                          )
                        })()}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t">
                          <div>
                            <p className="font-bold text-sm flex items-center justify-center gap-0.5">
                              <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {parseFloat(f.rating) > 0 ? parseFloat(f.rating).toFixed(1) : '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">Rating</p>
                          </div>
                          <div>
                            <p className="font-bold text-sm">{f.completed_jobs}</p>
                            <p className="text-xs text-muted-foreground">Jobs</p>
                          </div>
                          <div>
                            <p className="font-bold text-sm">{f.skills.length}</p>
                            <p className="text-xs text-muted-foreground">Skills</p>
                          </div>
                        </div>

                        {/* Skills preview */}
                        {f.skills.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {f.skills.slice(0, 3).map(s => (
                              <span key={s.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                {s.skill.name}
                              </span>
                            ))}
                            {f.skills.length > 3 && (
                              <span className="text-xs text-muted-foreground px-1">
                                +{f.skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {f.hourly_rate && (
                          <p className="text-sm text-muted-foreground border-t pt-2">
                            <span className="font-semibold text-foreground">
                              {parseFloat(f.hourly_rate).toLocaleString('fr-DZ')} DZD
                            </span>
                            {' / hr'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}