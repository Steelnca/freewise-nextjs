'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { services as servicesApi, jobs as jobsApi } from '@/lib/api'
import type { Service, Category } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeftIcon, PlusIcon, TrashIcon, PackageIcon } from 'lucide-react'

interface PkgForm {
  id?:           number
  title:         string
  description:   string
  price:         string
  delivery_days: string
  revisions:     string
}

const PACKAGE_LABELS = ['Basic', 'Standard', 'Premium']

export default function EditServicePage() {
  const { id }    = useParams()
  const { mode }  = useMode()
  const { t }     = useLocale()
  const router    = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    title: '', description: '', category_id: '', status: 'ACTIVE',
  })
  const [packages, setPackages] = useState<PkgForm[]>([])

  useEffect(() => {
    if (mode !== 'freelancer') return
    Promise.all([
      servicesApi.get(Number(id)),
      jobsApi.categories(),
    ]).then(([s, c]) => {
      const service = s.data
      setCategories(c.data)
      setForm({
        title:       service.title,
        description: service.description,
        category_id: service.category ? String(service.category.id) : '',
        status:      service.status,
      })
      setPackages(service.packages.map(p => ({
        id:            p.id,
        title:         p.title,
        description:   p.description,
        price:         p.price,
        delivery_days: String(p.delivery_days),
        revisions:     String(p.revisions),
      })))
    }).catch(() => {
      toast.error('Service not found.')
      router.push('/dashboard/services')
    }).finally(() => setLoading(false))
  }, [id, mode])

  if (mode !== 'freelancer') {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Switch to Freelancer mode to edit services.</p>
        <Button variant="outline" asChild><Link href="/dashboard">Back</Link></Button>
      </div>
    )
  }

  const setField = (key: string, value: string) => {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const setPkg = (i: number, key: keyof PkgForm, value: string) =>
    setPackages(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: value } : p))

  const addPackage = () => {
    if (packages.length >= 3) return
    setPackages(prev => [...prev, {
      title: PACKAGE_LABELS[prev.length] ?? '', description: '',
      price: '', delivery_days: '', revisions: '1',
    }])
  }

  const removePackage = (i: number) => {
    if (packages.length <= 1) return
    setPackages(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await servicesApi.update(Number(id), {
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
      toast.success('Service updated!')
      router.push('/dashboard/services')
    } catch (err: any) {
      toast.error('Failed to update service.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/services">
          <ArrowLeftIcon className="w-4 h-4 mr-1" /> {t.common.back}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Service</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your service listing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Service Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Service Title *</Label>
              <Input value={form.title} onChange={e => setField('title', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={6}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
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
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Packages</CardTitle>
            {packages.length < 3 && (
              <Button type="button" size="sm" variant="outline" onClick={addPackage}>
                <PlusIcon className="w-3 h-3 mr-1" /> Add Package
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <AnimatePresence>
              {packages.map((pkg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <PackageIcon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-semibold text-sm">{PACKAGE_LABELS[i] ?? `Package ${i + 1}`}</span>
                    </div>
                    {packages.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0" onClick={() => removePackage(i)}>
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Package Name</Label>
                    <Input value={pkg.title} onChange={e => setPkg(i, 'title', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>What's included</Label>
                    <textarea value={pkg.description} onChange={e => setPkg(i, 'description', e.target.value)} rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Price (DZD) *</Label>
                      <Input type="number" min={0} value={pkg.price} onChange={e => setPkg(i, 'price', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery (days) *</Label>
                      <Input type="number" min={1} value={pkg.delivery_days} onChange={e => setPkg(i, 'delivery_days', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Revisions</Label>
                      <Input type="number" min={0} value={pkg.revisions} onChange={e => setPkg(i, 'revisions', e.target.value)} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? t.common.loading : t.common.save}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/services">{t.common.cancel}</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}