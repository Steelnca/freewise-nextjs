'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, GripVertical, Lock, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { contracts } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PlanSource = 'CLIENT' | 'FREELANCER'

type MilestonePlanItemLike = {
  public_id?: string
  title: string
  description?: string
  amount: string
  due_date: string
  order: number
  source: PlanSource
  can_be_suggested?: boolean
  status?: string
}

type MilestonePlanLike = {
  public_id: string
  status?: string
  note?: string
  suggestion_enabled?: boolean
  total_amount?: string
  currency?: string
  items?: MilestonePlanItemLike[]
}

type DraftItem = {
  id: string
  title: string
  description: string
  amount: string
  due_date: string
  order: number
  source: PlanSource
  can_be_suggested: boolean
}

type Props = {
  proposalPublicId: string
  initialPlan?: MilestonePlanLike | null
  locked?: boolean
  disabledReason?: string
  onSaved?: (plan: MilestonePlanLike | null) => void
}

function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? `item_${Math.random().toString(36).slice(2)}`).replaceAll('-', '')
}

function sortByOrder(items: DraftItem[]) {
  return [...items].sort((a, b) => a.order - b.order).map((item, index) => ({ ...item, order: index + 1 }))
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('fr-DZ').format(Number.isFinite(amount) ? amount : 0)
}

function toInputDate(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

export default function MilestonePlanEditor({
  proposalPublicId,
  initialPlan = null,
  locked = false,
  disabledReason,
  onSaved,
}: Props) {
  const [planPublicId, setPlanPublicId] = useState<string | null>(initialPlan?.public_id ?? null)
  const [planStatus, setPlanStatus] = useState<string>(initialPlan?.status ?? 'DRAFT')
  const [note, setNote] = useState(initialPlan?.note ?? '')
  const [suggestionEnabled, setSuggestionEnabled] = useState<boolean>(
    initialPlan?.suggestion_enabled ?? true,
  )
  const [items, setItems] = useState<DraftItem[]>(
    sortByOrder(
      (initialPlan?.items ?? []).map((item, index) => ({
        id: item.public_id ?? `seed_${index}`,
        title: item.title ?? '',
        description: item.description ?? '',
        amount: String(item.amount ?? ''),
        due_date: toInputDate(item.due_date),
        order: item.order ?? index + 1,
        source: item.source ?? 'CLIENT',
        can_be_suggested: item.can_be_suggested ?? true,
      })),
    ),
  )
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPlanPublicId(initialPlan?.public_id ?? null)
    setPlanStatus(initialPlan?.status ?? 'DRAFT')
    setNote(initialPlan?.note ?? '')
    setSuggestionEnabled(initialPlan?.suggestion_enabled ?? true)
    setItems(
      sortByOrder(
        (initialPlan?.items ?? []).map((item, index) => ({
          id: item.public_id ?? `seed_${index}`,
          title: item.title ?? '',
          description: item.description ?? '',
          amount: String(item.amount ?? ''),
          due_date: toInputDate(item.due_date),
          order: item.order ?? index + 1,
          source: item.source ?? 'CLIENT',
          can_be_suggested: item.can_be_suggested ?? true,
        })),
      ),
    )
  }, [initialPlan?.public_id])

  const isReadOnly = locked || ['APPROVED', 'LOCKED'].includes(String(planStatus ?? '').toUpperCase())
  const canToggleSuggestion = !isReadOnly && items.length > 0
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }, [items])

  const addItem = () => {
    if (isReadOnly) return
    setItems((current) =>
      sortByOrder([
        ...current,
        {
          id: uid(),
          title: '',
          description: '',
          amount: '',
          due_date: '',
          order: current.length + 1,
          source: 'CLIENT',
          can_be_suggested: true,
        },
      ]),
    )
  }

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    if (isReadOnly) return
    setItems((current) =>
      sortByOrder(current.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    )
  }

  const removeItem = (id: string) => {
    if (isReadOnly) return
    setItems((current) => sortByOrder(current.filter((item) => item.id !== id)))
  }

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (isReadOnly) return
    setItems((current) => {
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return sortByOrder(next)
    })
  }

  const validate = () => {
    if (!items.length) {
      toast.error('Add at least one milestone item.')
      return false
    }

    for (const [index, item] of items.entries()) {
      if (!item.title.trim()) {
        toast.error(`Milestone #${index + 1} needs a title.`)
        return false
      }
      if (!item.amount || Number(item.amount) <= 0) {
        toast.error(`Milestone #${index + 1} needs a valid amount.`)
        return false
      }
      if (!item.due_date) {
        toast.error(`Milestone #${index + 1} needs a due date.`)
        return false
      }
    }

    return true
  }

  const buildPayload = () => ({
    note: note.trim(),
    suggestion_enabled: canToggleSuggestion ? suggestionEnabled : false,
    items: items.map((item, index) => ({
      title: item.title.trim(),
      description: item.description.trim(),
      amount: String(item.amount).trim(),
      due_date: item.due_date,
      order: index + 1,
      source: item.source,
      can_be_suggested: item.can_be_suggested,
      metadata: {},
    })),
  })

  const persist = async () => {
    if (isReadOnly) return null
    if (!validate()) return null

    setSaving(true)
    try {
      const payload = buildPayload()

      const response = planPublicId
        ? await contracts.updateMilestonePlan(planPublicId, payload)
        : await contracts.createMilestonePlan(proposalPublicId, payload)

      const plan: MilestonePlanLike = response.data
      setPlanPublicId(plan.public_id)
      setPlanStatus(plan.status ?? 'DRAFT')
      setSuggestionEnabled(plan.suggestion_enabled ?? false)
      toast.success('Milestone plan saved.')
      onSaved?.(plan)
      return plan
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save milestone plan.')
      return null
    } finally {
      setSaving(false)
    }
  }

  const approve = async () => {
    const saved = await persist()
    if (!saved) return

    setSaving(true)
    try {
      await contracts.approveMilestonePlan(saved.public_id)
      setPlanStatus('APPROVED')
      toast.success('Milestone plan approved.')
      onSaved?.(saved)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to approve milestone plan.')
    } finally {
      setSaving(false)
    }
  }

  const emptyState = !items.length

  return (
    <Card className="rounded-3xl border-border/70 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              Milestone plan
              <Badge variant="secondary">{items.length} item{items.length === 1 ? '' : 's'}</Badge>
              <Badge variant="outline">{formatMoney(totalAmount)} DZD</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Build the payment split here. Ordering locks automatically once live funding starts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={isReadOnly ? 'destructive' : 'default'}
              className={isReadOnly ? 'border-red-200 bg-red-50 text-red-700' : ''}
            >
              {isReadOnly ? 'Ordering locked' : 'Editable'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={canToggleSuggestion && suggestionEnabled ? 'default' : 'outline'}
            onClick={() => {
              if (canToggleSuggestion) setSuggestionEnabled((current) => !current)
            }}
            disabled={!canToggleSuggestion}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Suggestions {suggestionEnabled ? 'on' : 'off'}
          </Button>

          {!canToggleSuggestion ? (
            <span className="text-sm text-muted-foreground">
              Add at least one item before suggestion can be toggled.
            </span>
          ) : null}

          {locked ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              {disabledReason || 'Ordering is locked because a funded milestone already exists.'}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Plan note</Label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for this milestone split..."
            rows={3}
            disabled={isReadOnly}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {emptyState ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No milestone items yet.</p>
            <Button type="button" className="mt-4" onClick={addItem} disabled={isReadOnly}>
              <Plus className="mr-2 h-4 w-4" />
              Add first milestone
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable={!isReadOnly}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => {
                  if (isReadOnly) return
                  event.preventDefault()
                }}
                onDrop={(event) => {
                  if (isReadOnly) return
                  event.preventDefault()
                  if (dragIndex === null || dragIndex === index) return
                  moveItem(dragIndex, index)
                  setDragIndex(null)
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`rounded-2xl border bg-background p-4 transition ${
                  dragIndex === index ? 'border-primary/60 shadow-md' : 'border-border/70'
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <Badge variant="outline">{item.source.toLowerCase()}</Badge>
                    {item.can_be_suggested ? (
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        suggestable
                      </Badge>
                    ) : (
                      <Badge variant="destructive">locked</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="cursor-grab active:cursor-grabbing"
                      disabled={isReadOnly}
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setItems((current) => {
                          const next = [...current]
                          const target = index - 1
                          if (target < 0) return current
                          ;[next[target], next[index]] = [next[index], next[target]]
                          return sortByOrder(next)
                        })
                      }
                      disabled={isReadOnly || index === 0}
                      title="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setItems((current) => {
                          const next = [...current]
                          const target = index + 1
                          if (target >= next.length) return current
                          ;[next[target], next[index]] = [next[index], next[target]]
                          return sortByOrder(next)
                        })
                      }
                      disabled={isReadOnly || index === items.length - 1}
                      title="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={isReadOnly}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={item.title}
                      onChange={(event) => updateItem(item.id, { title: event.target.value })}
                      placeholder="e.g. Discovery and wireframes"
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(event) => updateItem(item.id, { amount: event.target.value })}
                      placeholder="0.00"
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={item.due_date}
                      onChange={(event) => updateItem(item.id, { due_date: event.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={item.source}
                      onValueChange={(value) => updateItem(item.id, { source: value as PlanSource })}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLIENT">Client</SelectItem>
                        <SelectItem value="FREELANCER">Freelancer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(event) => updateItem(item.id, { description: event.target.value })}
                    placeholder="What is included in this milestone?"
                    rows={3}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {item.can_be_suggested ? 'This milestone can be suggested.' : 'This milestone is locked.'}
                  </div>

                  <Button
                    type="button"
                    variant={item.can_be_suggested ? 'secondary' : 'outline'}
                    onClick={() => updateItem(item.id, { can_be_suggested: !item.can_be_suggested })}
                    disabled={isReadOnly}
                  >
                    {item.can_be_suggested ? 'Lock item' : 'Allow suggestion'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Total split amount:{' '}
            <span className="font-medium text-foreground">{formatMoney(totalAmount)} DZD</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addItem} disabled={isReadOnly}>
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>

            <Button type="button" variant="secondary" onClick={persist} disabled={saving || isReadOnly}>
              <Save className="mr-2 h-4 w-4" />
              Save plan
            </Button>

            <Button type="button" onClick={approve} disabled={saving || isReadOnly}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}