
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { useLocale } from '@/context/locale-context'
import { freelancers as freelancersApi, reviews as reviewsApi, services as servicesApi } from '@/lib/api'
import type { FreelancerProfile, Review, Service } from '@/lib/types'
import Navbar from '@/components/layout/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  StarIcon, BriefcaseIcon, ClockIcon,
  RefreshCwIcon, GlobeIcon, CheckCircleIcon,
} from 'lucide-react'

const AVAILABILITY_STYLE: Record<string, { cls: string; label: string }> = {
  AVAILABLE:   { cls: 'bg-green-100 text-green-700',  label: '🟢 Available' },
  BUSY:        { cls: 'bg-yellow-100 text-yellow-700', label: '🟡 Busy' },
  UNAVAILABLE: { cls: 'bg-gray-100 text-gray-600',    label: '🔴 Unavailable' },
}

export default function FreelancerProfilePage() {
  const { slug }  = useParams()
  const { t }     = useLocale()
  const router    = useRouter()

  const [profile,  setProfile]  = useState<FreelancerProfile | null>(null)
  const [reviews,  setReviews]  = useState<Review[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      freelancersApi.getBySlug(String(slug)),
      reviewsApi.freelancer(String(slug)),
      servicesApi.list(),
    ]).then(([p, r, s]) => {
      setProfile(p.data)
      setReviews(r.data)
      setServices(s.data.filter(svc => svc.freelancer_slug === String(slug)))
    }).catch(() => router.push('/'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container-fw py-16 max-w-4xl space-y-4">
          <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          <div className="h-48 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!profile) return null

  const avail = AVAILABILITY_STYLE[profile.availability] ?? AVAILABILITY_STYLE.UNAVAILABLE
  const avgRating = parseFloat(profile.rating)

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />

      <div className="container-fw py-10 max-w-5xl flex-1">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left: profile card ── */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-6 text-center space-y-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold mx-auto">
                    {profile.username[0].toUpperCase()}
                  </div>

                  <div>
                    <h1 className="text-xl font-bold">{profile.username}</h1>
                    {profile.title && (
                      <p className="text-sm text-muted-foreground mt-0.5">{profile.title}</p>
                    )}
                  </div>

                  {/* Availability */}
                  <span className={`text-xs px-3 py-1 rounded-full font-medium inline-block ${avail.cls}`}>
                    {avail.label}
                  </span>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t">
                    <div>
                      <p className="font-bold text-lg">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                        <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" /> Rating
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-lg">{profile.completed_jobs}</p>
                      <p className="text-xs text-muted-foreground">Jobs done</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg">{reviews.length}</p>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                    </div>
                  </div>

                  {profile.hourly_rate && (
                    <div className="text-sm text-muted-foreground border-t pt-3">
                      <span className="font-semibold text-foreground text-base">
                        {parseFloat(profile.hourly_rate).toLocaleString('fr-DZ')} DZD
                      </span>
                      {' / hour'}
                    </div>
                  )}

                  {profile.portfolio_url && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                        <GlobeIcon className="w-3.5 h-3.5 mr-1.5" /> View Portfolio
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Skills */}
            {profile.skills.length > 0 && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map(s => (
                      <span key={s.id} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                        {s.skill.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right: bio, services, reviews ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Bio */}
            {profile.bio && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-semibold mb-3">About</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{profile.bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="font-semibold">Services</h2>
                    <div className="space-y-3">
                      {services.map(svc => {
                        const lowest = svc.packages.reduce(
                          (min, p) => parseFloat(p.price) < parseFloat(min.price) ? p : min,
                          svc.packages[0]
                        )
                        return (
                          <Link key={svc.id} href={`/services/${svc.id}`}>
                            <div className="flex items-center justify-between p-3 rounded-xl border hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                                  {svc.title}
                                </p>
                                {lowest && (
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{lowest.delivery_days}d</span>
                                    <span className="flex items-center gap-1"><RefreshCwIcon className="w-3 h-3" />{lowest.revisions}x</span>
                                  </div>
                                )}
                              </div>
                              {lowest && (
                                <span className="text-sm font-bold shrink-0 ml-4">
                                  {parseFloat(lowest.price).toLocaleString('fr-DZ')} DZD
                                </span>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Reviews */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Reviews</h2>
                    {reviews.length > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold">{avgRating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({reviews.length})</span>
                      </div>
                    )}
                  </div>

                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review, i) => (
                        <div key={review.id}>
                          {i > 0 && <Separator />}
                          <div className="pt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{review.reviewer_username}</p>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, si) => (
                                  <StarIcon
                                    key={si}
                                    className={`w-3.5 h-3.5 ${si < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <footer className="border-t mt-auto">
        <div className="container-fw py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Free<span className="text-blue-500">wise</span></span>
          <span>© {new Date().getFullYear()} Freewise</span>
        </div>
      </footer>
    </div>
  )
}