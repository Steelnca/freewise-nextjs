'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
} from 'lucide-react'

import { jobs as jobsApi } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type {
  Category,
  ExperienceLevel,
  MilestonePlanDraftItem,
  MilestonePlanDraftPayload,
} from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type JobFormState = {
  title: string
  description: string
  category_id: string
  experience_level: string
  budget_total: string
  deadline: string
}

type DraftItem = MilestonePlanDraftItem

const money = (value: string | number | null | undefined) =>
  Number(value || 0).toLocaleString('fr-DZ')

const makeItem = (order: number): DraftItem => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  amount: '',
  due_date: '',
  order,
  source: 'CLIENT',
  can_be_suggested: true,
})

function MilestonePlanEditor({
  initialValue,
  disabled,
  onChange,
}: {
  initialValue: MilestonePlanDraftPayload | null
  disabled?: boolean
  onChange: (payload: MilestonePlanDraftPayload | null) => void
}) {
  const [note, setNote] = useState(initialValue?.note ?? '')
  const [suggestionEnabled, setSuggestionEnabled] = useState(initialValue?.suggestion_enabled ?? true)
  const [items, setItems] = useState<DraftItem[]>(
    initialValue?.items?.length
      ? initialValue.items.map((item, index) => ({
          id: crypto.randomUUID(),
          title: item.title,
          description: item.description ?? '',
          amount: String(item.amount),
          due_date: item.due_date,
          order: item.order ?? index + 1,
          source: item.source ?? 'CLIENT',
          can_be_suggested: item.can_be_suggested ?? true,
        }))
      : []
  )

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items]
  )

  useEffect(() => {
    if (items.length === 0) {
      onChange(null)
      setSuggestionEnabled(true)
      return
    }

    onChange({
      note,
      suggestion_enabled: suggestionEnabled,
      items: items.map(({ id, ...rest }) => rest),
    })
  }, [items, note, onChange, suggestionEnabled])

  const addItem = () => {
    setItems((current) => [...current, makeItem(current.length + 1)])
  }

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    setItems((current) =>
      current
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, order: index + 1 }))
    )
  }

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id)
      if (index < 0) return current

      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= current.length) return current

      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(swapIndex, 0, moved)
      return next.map((item, idx) => ({ ...item, order: idx + 1 }))
    })
  }

  const canToggleSuggestions = items.length > 0

  return (
    <Card className="rounded-3xl border-dashed">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Milestone plan</CardTitle>
            <CardDescription>
              Build the split now if you already know the structure. Freelancers will see it before bidding.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{items.length} items</Badge>
            <Badge variant="outline">{money(total)} DZD</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={canToggleSuggestions && suggestionEnabled ? 'default' : 'outline'}
            onClick={() => {
              if (!canToggleSuggestions || disabled) return
              const next = !suggestionEnabled
              setSuggestionEnabled(next)
            }}
            disabled={disabled || !canToggleSuggestions}
          >
            <SparklesIcon className="mr-2 h-4 w-4" />
            Suggestions {suggestionEnabled ? 'on' : 'off'}
          </Button>

          {!canToggleSuggestions ? (
            <p className="text-sm text-muted-foreground">
              Add at least one item to enable suggestions.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Plan note</Label>
          <Textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
            }}
            disabled={disabled}
            placeholder="Optional note for freelancers..."
            rows={3}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No milestone items yet.</p>
            <Button type="button" className="mt-4" onClick={addItem} disabled={disabled}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add first milestone
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-2xl border p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    {item.can_be_suggested ? <Badge>suggestable</Badge> : <Badge variant="destructive">locked</Badge>}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(item.id, 'up')}
                      disabled={disabled || index === 0}
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(item.id, 'down')}
                      disabled={disabled || index === items.length - 1}
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={disabled}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={item.title}
                      onChange={(event) => updateItem(item.id, { title: event.target.value })}
                      disabled={disabled}
                      placeholder="e.g. Discovery phase"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(event) => updateItem(item.id, { amount: event.target.value })}
                      disabled={disabled}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={item.due_date}
                      onChange={(event) => updateItem(item.id, { due_date: event.target.value })}
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.order}
                      onChange={(event) =>
                        updateItem(item.id, {
                          order: Math.max(1, Number(event.target.value || 1)),
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(event) => updateItem(item.id, { description: event.target.value })}
                    disabled={disabled}
                    placeholder="What is included in this milestone?"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Total plan amount: <span className="font-medium text-foreground">{money(total)} DZD</span>
          </div>

          <Button type="button" variant="outline" onClick={addItem} disabled={disabled}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function JobPostPage() {
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createPlanNow, setCreatePlanNow] = useState(false)
  const [milestonePlan, setMilestonePlan] = useState<MilestonePlanDraftPayload | null>(null)

  const [form, setForm] = useState<JobFormState>({
    title: '',
    description: '',
    category_id: '',
    experience_level: 'INTERMEDIATE',
    budget_total: '',
    deadline: '',
  })

  useEffect(() => {
    let mounted = true
    setLoadingCategories(true)

    jobsApi
      .categories()
      .then((response) => {
        if (!mounted) return
        setCategories(response.data)
      })
      .catch(() => {
        if (!mounted) return
        setCategories([])
      })
      .finally(() => {
        if (!mounted) return
        setLoadingCategories(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const derivedPlanTotal = useMemo(() => {
    if (!milestonePlan?.items?.length) return ''
    const total = milestonePlan.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return total ? total.toFixed(2) : ''
  }, [milestonePlan])

  useEffect(() => {
    if (createPlanNow && derivedPlanTotal) {
      setForm((current) => ({ ...current, budget_total: derivedPlanTotal }))
    }
  }, [createPlanNow, derivedPlanTotal])

  const updateField = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const validate = () => {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.description.trim()) return 'Description is required.'
    if (!form.category_id) return 'Category is required.'
    if (!form.deadline) return 'Deadline is required.'

    if (createPlanNow) {
      if (!milestonePlan?.items?.length) {
        return 'Add at least one milestone item if you want to create the plan now.'
      }
      return null
    }

    if (!form.budget_total || Number(form.budget_total) <= 0) {
      return 'Enter a total deal price when no milestone plan is provided.'
    }

    return null
  }

  const submit = async () => {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: Number(form.category_id),
        experience_level: form.experience_level as ExperienceLevel,
        budget_total: form.budget_total,
        deadline: form.deadline,
      }

      if (createPlanNow && milestonePlan) {
        payload.milestone_plan = milestonePlan
        payload.budget_total = derivedPlanTotal || form.budget_total
      }

      await jobsApi.create(payload)
      toast.success('Job posted successfully.')
      router.push(ROUTES.dashboard.jobs.root)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create job.')
      console.log(err?.response?.data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="-ml-2 w-fit">
            <Link href={ROUTES.dashboard.jobs.root}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to jobs
            </Link>
          </Button>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Post a job</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Keep it lean. Add a milestone plan only if you already know the split and want freelancers to see it before bidding.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">budget {form.budget_total ? money(form.budget_total) : '—'}</Badge>
          <Badge variant="outline">plan {createPlanNow ? 'on' : 'off'}</Badge>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Job details</CardTitle>
            <CardDescription>
              Tell freelancers what needs to be done, then decide whether to add a split plan now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="e.g. Build a landing page for my store"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  rows={6}
                  placeholder="Tell freelancers what you need and what the result should look like."
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(value) => updateField('category_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCategories ? 'Loading categories...' : 'Choose category'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => {
                      const value = String(category.id ?? category.slug ?? category.name)
                      return (
                        <SelectItem key={value} value={value}>
                          {category.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Experience level</Label>
                <Select
                  value={form.experience_level}
                  onValueChange={(value) => updateField('experience_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER"> Beginner </SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="EXPERT">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(event) => updateField('deadline', event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Price</CardTitle>
            <CardDescription>
              Use one total deal price. If you add a plan, the plan total becomes the deal total.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Total deal price</Label>
              <Input
                inputMode="decimal"
                value={form.budget_total}
                onChange={(event) => updateField('budget_total', event.target.value)}
                placeholder="0.00"
                disabled={createPlanNow}
              />
              {createPlanNow && derivedPlanTotal ? (
                <p className="text-xs text-muted-foreground">
                  Plan total: <span className="font-medium text-foreground">{money(derivedPlanTotal)} DZD</span>
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              {createPlanNow ? (
                <p>
                  You are creating the milestone split now. Freelancers will see the plan before bidding.
                </p>
              ) : (
                <p>
                  No split yet. Freelancers can propose the milestone plan later during bidding.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-4">
              <div>
                <p className="font-medium">Create milestone plan now</p>
                <p className="text-sm text-muted-foreground">
                  Turn this on only if you already know the split.
                </p>
              </div>
              <Button
                type="button"
                variant={createPlanNow ? 'outline' : 'default'}
                onClick={() => setCreatePlanNow((current) => !current)}
              >
                {createPlanNow ? 'Disabled' : 'Enabled'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {createPlanNow ? (
        <section>
          <MilestonePlanEditor initialValue={milestonePlan} onChange={setMilestonePlan} />
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              This is what freelancers should understand before bidding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground">Title</p>
              <p className="mt-1 font-medium">{form.title || 'Untitled job'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="mt-1 font-semibold">
                  {createPlanNow && derivedPlanTotal
                    ? `${money(derivedPlanTotal)} DZD`
                    : form.budget_total
                      ? `${money(form.budget_total)} DZD`
                      : '—'}
                </p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="mt-1 font-semibold">{form.deadline || '—'}</p>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground">Flow</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {createPlanNow
                  ? 'Client plan is visible now and freelancers can respond to it.'
                  : 'Freelancers can propose the split later when bidding.'}
              </p>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">simple MVP</Badge>
              <Badge variant="outline">public_id routes</Badge>
              <Badge variant="outline">milestone ready</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-dashed">
          <CardHeader>
            <CardTitle>Publishing rules</CardTitle>
            <CardDescription>
              Keep the backend strict and the frontend honest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• If you create a plan now, the suggestion toggle is only usable after at least one item exists.</p>
            <p>• If you do not create a plan, the deal price is required and freelancers can propose the split later.</p>
            <p>• The backend will reject invalid combinations, so the UI should not try to silently fix bad input.</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push(ROUTES.dashboard.jobs.root)}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={saving}>
          {saving ? (
            'Posting...'
          ) : (
            <>
              <CheckCircle2Icon className="mr-2 h-4 w-4" />
              Post job
            </>
          )}
        </Button>
      </div>
    </main>
  )
}
