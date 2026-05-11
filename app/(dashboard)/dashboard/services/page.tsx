'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { services as servicesApi, orders as ordersApi } from '@/lib/api'
import type { Service, Order } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  PlusIcon, StarIcon, ClockIcon, RefreshCwIcon,
  PackageIcon, ArrowRightIcon, CheckCircleIcon,
} from 'lucide-react'

const SERVICE_STATUS_CLS: Record<string, string> = {
  DRAFT:  'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
}

const ORDER_STATUS_CLS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  ACTIVE:    'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  DISPUTED:  'bg-red-100 text-red-700',
}

export default function ServicesPage() {
  const { mode }    = useMode()
  const { t }       = useLocale()
  const isFreelancer = mode === 'freelancer'

  const [services,    setServices]    = useState<Service[]>([])
  const [orders,      setOrders]      = useState<Order[]>([])
  const [loading,     setLoading]     = useState(true)
  const [orderTarget, setOrderTarget] = useState<{ service: Service; packageIdx: number } | null>(null)
  const [requirements, setRequirements] = useState('')
  const [ordering,    setOrdering]    = useState(false)

  useEffect(() => {
    setLoading(true)
    if (isFreelancer) {
      servicesApi.mine()
        .then(r => setServices(r.data))
        .finally(() => setLoading(false))
    } else {
      Promise.all([servicesApi.list(), ordersApi.mine()])
        .then(([s, o]) => { setServices(s.data); setOrders(o.data) })
        .finally(() => setLoading(false))
    }
  }, [mode])

  const handleOrder = async () => {
    if (!orderTarget) return
    const pkg = orderTarget.service.packages[orderTarget.packageIdx]
    setOrdering(true)
    try {
      await ordersApi.create(orderTarget.service.id, {
        package_id:   pkg.id,
        requirements: requirements,
      })
      toast.success('Order placed! The freelancer will be notified.')
      setOrderTarget(null)
      setRequirements('')
      ordersApi.mine().then(r => setOrders(r.data))
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to place order.')
    } finally {
      setOrdering(false)
    }
  }

  const handleToggleStatus = async (service: Service) => {
    const next = service.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      await servicesApi.update(service.id, { status: next } as any)
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: next } : s))
      toast.success(`Service ${next === 'ACTIVE' ? 'activated' : 'paused'}.`)
    } catch {
      toast.error('Failed to update service.')
    }
  }

  // ── Freelancer view ───────────────────────────────────────────────────────

  if (isFreelancer) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Services</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Services clients can order directly without a job post
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/services/create">
              <PlusIcon className="w-4 h-4 mr-2" /> New Service
            </Link>
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t.common.loading}</p>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="py-20 flex flex-col items-center gap-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <PackageIcon className="w-7 h-7 text-blue-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">No services yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Create a service listing so clients can find and order your work directly — like a Fiverr gig.
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/services/create">Create your first service</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{service.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{service.description}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${SERVICE_STATUS_CLS[service.status]}`}>
                        {service.status}
                      </span>
                    </div>

                    {/* Packages */}
                    <div className="space-y-1.5">
                      {service.packages.map(pkg => (
                        <div key={pkg.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                          <span className="font-medium">{pkg.title}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{pkg.delivery_days}d</span>
                            <span className="flex items-center gap-1"><RefreshCwIcon className="w-3 h-3" />{pkg.revisions}x</span>
                            <span className="font-semibold text-foreground">{parseFloat(pkg.price).toLocaleString('fr-DZ')} DZD</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <Link href={`/dashboard/services/${service.id}/edit`}>{t.common.edit}</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleToggleStatus(service)}
                      >
                        {service.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Client view ───────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse Services</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Order directly from freelancers — no job posting needed
        </p>
      </div>

      {/* My Orders */}
      {orders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Orders</h2>
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{order.service_title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {order.package.title} · {parseFloat(order.package.price).toLocaleString('fr-DZ')} DZD
                        {' · '}by {order.freelancer_username}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_CLS[order.status]}`}>
                        {order.status}
                      </span>
                      {order.status === 'DELIVERED' && (
                        <Button size="sm" onClick={() => ordersApi.approve(order.id).then(() => {
                          toast.success('Order approved!')
                          ordersApi.mine().then(r => setOrders(r.data))
                        })}>
                          <CheckCircleIcon className="w-3 h-3 mr-1" /> Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator />
        </div>
      )}

      {/* Service listings */}
      {loading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : services.filter(s => s.status === 'ACTIVE').length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No services available yet. Check back soon!
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.filter(s => s.status === 'ACTIVE').map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="flex flex-col hover:shadow-lg transition-shadow">
                <CardContent className="p-5 flex flex-col flex-1 space-y-4">
                  {/* Header */}
                  <div className="space-y-1">
                    <p className="font-semibold leading-snug">{service.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>by <span className="text-foreground font-medium">{service.freelancer_username}</span></span>
                      <span className="flex items-center gap-0.5">
                        <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {parseFloat(service.freelancer_rating).toFixed(1)}
                      </span>
                    </div>
                    {service.category && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{service.category.name}</span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{service.description}</p>

                  {/* Starting price */}
                  {service.packages.length > 0 && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t">
                      <span className="text-muted-foreground">Starting at</span>
                      <span className="font-bold text-base">
                        {parseFloat(service.packages[0].price).toLocaleString('fr-DZ')} DZD
                      </span>
                    </div>
                  )}

                  {/* Packages */}
                  <div className="space-y-2">
                    {service.packages.map((pkg, pkgIdx) => (
                      <button
                        key={pkg.id}
                        onClick={() => setOrderTarget({ service, packageIdx: pkgIdx })}
                        className="w-full text-left border rounded-lg px-3 py-2.5 hover:border-blue-400 hover:bg-blue-50/50 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{pkg.title}</span>
                          <span className="text-sm font-bold group-hover:text-blue-600 transition-colors">
                            {parseFloat(pkg.price).toLocaleString('fr-DZ')} DZD
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{pkg.delivery_days} days</span>
                          <span className="flex items-center gap-1"><RefreshCwIcon className="w-3 h-3" />{pkg.revisions} revisions</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order dialog */}
      <Dialog open={!!orderTarget} onOpenChange={open => !open && setOrderTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            {orderTarget && (
              <div className="text-sm text-muted-foreground space-y-1 pt-1">
                <p className="font-medium text-foreground">{orderTarget.service.title}</p>
                <p>
                  {orderTarget.service.packages[orderTarget.packageIdx].title}
                  {' · '}
                  {parseFloat(orderTarget.service.packages[orderTarget.packageIdx].price).toLocaleString('fr-DZ')} DZD
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="requirements">Requirements</Label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="Describe exactly what you need — include any relevant details, links, brand guidelines, or references..."
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Payment will be held in escrow until you approve the delivery.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderTarget(null)}>{t.common.cancel}</Button>
            <Button onClick={handleOrder} disabled={ordering || !requirements.trim()}>
              {ordering ? t.common.loading : 'Place Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
