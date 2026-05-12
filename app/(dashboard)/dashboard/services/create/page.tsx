
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { services as servicesApi, jobs as jobsApi } from '@/lib/api'
import type { Category } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeftIcon, PlusIcon, TrashIcon, PackageIcon } from 'lucide-react'

interface PackageForm {
  title:         string
  description:   string
  price:         string
  delivery_days: string
  revisions:     string
}

const EMPTY_PACKAGE: PackageForm = {
  title: '', description: '', price: '', delivery_days: '', revisions: '1',
}

const PACKAGE_LABELS = ['Basic', 'Standard', 'Premium']

export default function CreateServicePage() {
  const { mode }  = useMode()
  const { t }     = useLocale()
  const router    = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    title:       '',
    description: '',
    category_id: '',
    status:      'ACTIVE',
  })

  const [packages, setPackages] = useState<PackageForm[]>([{ ...EMPTY_PACKAGE, title: 'Basic' }])

  useEffect(() => {
    jobsApi.categories().then(r => setCategories(r.data))
  }, [])

  if (mode !== 'freelancer') {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Switch to Freelancer mode to create a service.</p>
        <Button variant="outline" asChild><Link href="/dashboard">Back</Link></Button>
      </div>
    )
  }

  const setField = (key: string, value: string) => {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const setPkg = (i: number, key: keyof PackageForm, value: string) => {
    setPackages(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: value } : p))
  }

  const addPackage = () => {
    if (packages.length >= 3) return
    const nextLabel = PACKAGE_LABELS[packages.length]
    setPackages(prev => [...prev, { ...EMPTY_PACKAGE, title: nextLabel }])
  }

  const removePackage = (i: number) => {
    if (packages.length <= 1) return
    setPackages(prev => prev.filter((_, idx) => idx !== i))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.title.trim())       errs.title       = 'Title is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    packages.forEach((pkg, i) => {
      if (!pkg.price)         errs[`pkg_${i}_price`]    = 'Price required'
      if (!pkg.delivery_days) errs[`pkg_${i}_delivery`] = 'Delivery days required'
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await servicesApi.create({
        title:       form.title,
        description: form.description,
        category:    form.category_id ? Number(form.category_id) : null,
        status:      form.status as any,
        packages:    packages.map(p => ({
          title:         p.title,
          description:   p.description,
          price:         p.price,
          delivery_days: Number(p.delivery_days),
          revisions:     Number(p.revisions),
        })),
      } as any)
      toast.success('Service created!')
      router.push('/dashboard/services')
    } catch (err: any) {
      const data = err?.response?.data ?? {}
      const mapped: Record<string, string> = {}
      Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : String(v) })
      setErrors(mapped)
      toast.error('Failed to create service')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/services">
          <ArrowLeftIcon className="w-4 h-4 mr-1" /> {t.common.back}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.services.createService}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a service listing so clients can order your work directly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Basic info ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">Service Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Service Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="I will build a professional landing page"
                required
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              <p className="text-xs text-muted-foreground">
                Start with "I will..." — be specific about what you deliver
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Describe what clients will get, your process, what makes your service unique, and any requirements they need to provide..."
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                required
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id || 'none'} onValueChange={v => setField('category_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={form.status} onValueChange={v => setField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active — visible to clients</SelectItem>
                    <SelectItem value="DRAFT">Draft — hidden for now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Packages ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Packages</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Add up to 3 packages (Basic, Standard, Premium) with different prices and deliverables
              </p>
            </div>
            {packages.length < 3 && (
              <Button type="button" size="sm" variant="outline" onClick={addPackage}>
                <PlusIcon className="w-3 h-3 mr-1" /> Add Package
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <AnimatePresence>
              {packages.map((pkg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  {i > 0 && <Separator />}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <PackageIcon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-semibold text-sm">{PACKAGE_LABELS[i] ?? `Package ${i + 1}`}</span>
                    </div>
                    {packages.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        onClick={() => removePackage(i)}
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Package Name</Label>
                    <Input
                      value={pkg.title}
                      onChange={e => setPkg(i, 'title', e.target.value)}
                      placeholder={PACKAGE_LABELS[i] ?? 'Package name'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>What's included</Label>
                    <textarea
                      value={pkg.description}
                      onChange={e => setPkg(i, 'description', e.target.value)}
                      placeholder="List what's included in this package..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Price (DZD) *</Label>
                      <Input
                        type="number"
                        min={0}
                        value={pkg.price}
                        onChange={e => setPkg(i, 'price', e.target.value)}
                        placeholder="5000"
                      />
                      {errors[`pkg_${i}_price`] && (
                        <p className="text-xs text-destructive">{errors[`pkg_${i}_price`]}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery (days) *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={pkg.delivery_days}
                        onChange={e => setPkg(i, 'delivery_days', e.target.value)}
                        placeholder="7"
                      />
                      {errors[`pkg_${i}_delivery`] && (
                        <p className="text-xs text-destructive">{errors[`pkg_${i}_delivery`]}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Revisions</Label>
                      <Input
                        type="number"
                        min={0}
                        value={pkg.revisions}
                        onChange={e => setPkg(i, 'revisions', e.target.value)}
                        placeholder="2"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* ── Submit ── */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? t.common.loading : t.services.createService}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/services">{t.common.cancel}</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}