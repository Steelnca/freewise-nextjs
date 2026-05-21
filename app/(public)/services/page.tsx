'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useLocale } from '@/context/locale-context'
import { services as servicesApi, jobs as jobsApi } from '@/lib/api'
import type { Service, Category } from '@/lib/types'
import Navbar from '@/components/layout/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchIcon, StarIcon, ClockIcon, RefreshCwIcon } from 'lucide-react'
import Footer from '@/components/layout/Footer'

export default function ServicesPage() {
  const { t } = useLocale()

  const [allServices, setAllServices] = useState<Service[]>([])
  const [categories,  setCategories]  = useState<Category[]>([])
  const [search,      setSearch]      = useState('')
  const [category,    setCategory]    = useState('')
  const [loading,     setLoading]     = useState(true)

  const fetchServices = () => {
    setLoading(true)
    servicesApi.list({ search: search || undefined, category: category || undefined })
      .then(r => setAllServices(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    jobsApi.categories().then(r => setCategories(r.data))
    fetchServices()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(fetchServices, 400)
    return () => clearTimeout(debounce)
  }, [search, category])

  return (
    <div>

      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white">
        <div className="container-fw py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl space-y-4"
          >
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
              ✦ Algerian Freelancer Services
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Find the perfect service for your project
            </h1>
            <p className="text-blue-200 text-lg">
              Browse ready-made services from talented Algerian freelancers. Order directly — no job posting needed.
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
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={category || 'all'} onValueChange={v => setCategory(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Service grid */}
      <main className="container-fw py-10 flex-1">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : allServices.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <p className="text-2xl">🔍</p>
            <p className="text-muted-foreground">No services found. Try a different search.</p>
            <Button variant="outline" onClick={() => { setSearch(''); setCategory('') }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {allServices.length} service{allServices.length !== 1 ? 's' : ''} available
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {allServices.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <ServiceCard service={service} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* CTA for freelancers */}
      <section className="border-t bg-muted/30">
        <div className="container-fw py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold">Are you a freelancer?</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Create your service listing and start receiving orders today.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

// ── Service Card ──────────────────────────────────────────────────────────────

function ServiceCard({ service }: { service: Service }) {
  const lowestPkg = service.packages.reduce(
    (min, p) => parseFloat(p.price) < parseFloat(min.price) ? p : min,
    service.packages[0]
  )

  return (
    <Link href={`/services/${service.id}`}>
      <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group">
        <CardContent className="p-5 flex flex-col h-full space-y-3">

          {/* Category badge */}
          {service.category && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full w-fit font-medium">
              {service.category.name}
            </span>
          )}

          {/* Title */}
          <h3 className="font-semibold text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 flex-1">
            {service.title}
          </h3>

          {/* Freelancer */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              {service.freelancer_username[0].toUpperCase()}
            </div>
            <span className="truncate">{service.freelancer_username}</span>
            <span className="flex items-center gap-0.5 ml-auto shrink-0">
              <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
              {parseFloat(service.freelancer_rating).toFixed(1)}
            </span>
          </div>

          {/* Package highlights */}
          {lowestPkg && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />{lowestPkg.delivery_days}d
              </span>
              <span className="flex items-center gap-1">
                <RefreshCwIcon className="w-3 h-3" />{lowestPkg.revisions}x
              </span>
              <span className="ml-auto font-bold text-foreground text-sm">
                {parseFloat(lowestPkg.price).toLocaleString('fr-DZ')} DZD
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}