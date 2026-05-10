'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { jobs as jobsApi } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import type { Category } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

const EXPERIENCE_LEVELS = [
  { value: 'ENTRY',  label: 'Entry Level' },
  { value: 'MID',    label: 'Mid Level' },
  { value: 'EXPERT', label: 'Expert' },
]

export default function PostJobPage() {
  const { t } = useLocale()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    title:            '',
    description:      '',
    category_id:      '',
    experience_level: 'MID',
    budget_min:       '',
    budget_max:       '',
    deadline:         '',
  })

  useEffect(() => {
    jobsApi.categories().then(r => setCategories(r.data))
  }, [])

  const set = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await jobsApi.create({
        title:            form.title,
        description:      form.description,
        category_id:      form.category_id ? Number(form.category_id) : undefined,
        experience_level: form.experience_level as any,
        budget_min:       form.budget_min || undefined,
        budget_max:       form.budget_max || undefined,
        deadline:         form.deadline || undefined,
      } as any)
      toast.success('Job posted successfully!')
      router.push('/dashboard/client/jobs')
    } catch (err: any) {
      const data = err?.response?.data ?? {}
      const mapped: Record<string, string> = {}
      Object.entries(data).forEach(([k, v]) => {
        mapped[k] = Array.isArray(v) ? v[0] : String(v)
      })
      setErrors(mapped)
      toast.error('Failed to post job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/client/jobs">
            <ArrowLeftIcon className="w-4 h-4 mr-1" /> {t.common.back}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.jobs.post}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Describe your project and receive offers from Algerian freelancers.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Build a landing page for my startup"
                required
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe your project in detail — requirements, deliverables, and any specific skills needed."
                rows={6}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            {/* Category + Experience */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={v => set('category_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.jobs.experience}</Label>
                <Select value={form.experience_level} onValueChange={v => set('experience_level', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_min">Min Budget (DZD)</Label>
                <Input
                  id="budget_min"
                  type="number"
                  min={0}
                  value={form.budget_min}
                  onChange={e => set('budget_min', e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_max">Max Budget (DZD)</Label>
                <Input
                  id="budget_max"
                  type="number"
                  min={0}
                  value={form.budget_max}
                  onChange={e => set('budget_max', e.target.value)}
                  placeholder="20000"
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline">{t.jobs.deadline}</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {errors.non_field_errors && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {errors.non_field_errors}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? t.common.loading : 'Post Job'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/client/jobs">{t.common.cancel}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}