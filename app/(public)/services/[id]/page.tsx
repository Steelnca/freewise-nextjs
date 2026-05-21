
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useLocale } from '@/context/locale-context'
import { tokens } from '@/lib/auth'
import { services as servicesApi, orders as ordersApi } from '@/lib/api'
import type { Service } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeftIcon, StarIcon, ClockIcon,
  RefreshCwIcon, CheckIcon, ShieldCheckIcon,
} from 'lucide-react'

export default function ServiceDetailPage() {
  const { id }     = useParams()
  const { t }      = useLocale()
  const router     = useRouter()

  const [service,      setService]      = useState<Service | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [selectedPkg,  setSelectedPkg]  = useState(0)
  const [orderOpen,    setOrderOpen]    = useState(false)
  const [requirements, setRequirements] = useState('')
  const [ordering,     setOrdering]     = useState(false)

  useEffect(() => {
    servicesApi.get(Number(id))
      .then(r => setService(r.data))
      .catch(() => router.push('/services'))
      .finally(() => setLoading(false))
  }, [id])

  const handleOrder = async () => {
    if (!service || !tokens.isLoggedIn()) {
      router.push('/login')
      return
    }
    const pkg = service.packages[selectedPkg]
    setOrdering(true)
    try {
      await ordersApi.create(service.id, {
        package_id:   pkg.id,
        requirements: requirements,
      })
      toast.success('Order placed! Check your dashboard.')
      setOrderOpen(false)
      router.push('/dashboard/services')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to place order.')
    } finally {
      setOrdering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="container-fw py-16">
          <div className="space-y-4 max-w-3xl">
            <div className="h-8 bg-muted rounded-lg animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-48 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!service) return null

  const selectedPackage = service.packages[selectedPkg]

  return (
    <div className="bg-muted/20">

      <div className="container-fw py-8 flex-1">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link href="/services"><ArrowLeftIcon className="w-4 h-4 mr-1" /> All Services</Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left: service info ── */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

              {service.category && (
                <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
                  {service.category.name}
                </span>
              )}

              <h1 className="text-2xl font-bold mt-3 leading-snug">{service.title}</h1>

              {/* Freelancer */}
              <div className="flex items-center gap-3 mt-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                  {service.freelancer_username[0].toUpperCase()}
                </div>
                <div>
                  <Link
                    href={`/freelancers/${service.freelancer_slug}`}
                    className="font-semibold text-sm hover:underline"
                  >
                    {service.freelancer_username}
                  </Link>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {parseFloat(service.freelancer_rating).toFixed(1)} rating
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-3">About this service</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {service.description}
                </p>
              </CardContent>
            </Card>

            {/* Tags */}
            {service.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {service.tags.map(tag => (
                  <span key={tag.id} className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: packages & order ── */}
          <div className="space-y-4">

            {/* Package selector */}
            {service.packages.length > 1 && (
              <div className="flex rounded-lg border overflow-hidden">
                {service.packages.map((pkg, i) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPkg(i)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      i === selectedPkg
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {pkg.title}
                  </button>
                ))}
              </div>
            )}

            {/* Selected package details */}
            {selectedPackage && (
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{selectedPackage.title}</span>
                    <span className="text-2xl font-bold">
                      {parseFloat(selectedPackage.price).toLocaleString('fr-DZ')}
                      <span className="text-sm font-normal text-muted-foreground ml-1">DZD</span>
                    </span>
                  </div>

                  {selectedPackage.description && (
                    <p className="text-sm text-muted-foreground">{selectedPackage.description}</p>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    {[
                      { icon: ClockIcon,      label: `${selectedPackage.delivery_days} day delivery` },
                      { icon: RefreshCwIcon,  label: `${selectedPackage.revisions} revision${selectedPackage.revisions !== 1 ? 's' : ''}` },
                      { icon: ShieldCheckIcon,label: 'Payment held in escrow until approved' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      if (!tokens.isLoggedIn()) { router.push('/login'); return }
                      setOrderOpen(true)
                    }}
                  >
                    {t.services.placeOrder}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    You won't be charged until you confirm your requirements
                  </p>
                </CardContent>
              </Card>
            )}

            {/* All packages comparison */}
            {service.packages.length > 1 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compare Packages</p>
                  {service.packages.map((pkg, i) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPkg(i)}
                      className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        i === selectedPkg ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {i === selectedPkg && <CheckIcon className="w-3.5 h-3.5 text-primary" />}
                        <span className="text-sm font-medium">{pkg.title}</span>
                      </div>
                      <span className="text-sm font-bold">
                        {parseFloat(pkg.price).toLocaleString('fr-DZ')} DZD
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Order dialog */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.services.placeOrder}</DialogTitle>
            {selectedPackage && (
              <p className="text-sm text-muted-foreground pt-1">
                {service.title} — {selectedPackage.title} ({parseFloat(selectedPackage.price).toLocaleString('fr-DZ')} DZD)
              </p>
            )}
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="requirements">{t.services.requirements}</Label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="Describe exactly what you need — include any relevant details, brand guidelines, links, or references the freelancer should know..."
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-start gap-2">
              <ShieldCheckIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Payment is held securely in escrow and only released when you approve the delivery.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleOrder} disabled={ordering || !requirements.trim()}>
              {ordering ? t.common.loading : 'Confirm Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}