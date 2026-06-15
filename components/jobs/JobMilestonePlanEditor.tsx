
'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { PlusIcon, Trash2Icon, ArrowUpIcon, ArrowDownIcon, SparklesIcon } from 'lucide-react'
import type { MilestonePlanDraftItem, MilestonePlanDraftPayload, SplitOwner } from '@/lib/types'

type Props = {
  splitOwner: SplitOwner
  initialNote?: string
  onChange?: (payload: MilestonePlanDraftPayload | null) => void
}

type DraftItem = MilestonePlanDraftItem

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

export default function JobMilestonePlanEditor({ splitOwner, initialNote = '', onChange }: Props) {
  const [note, setNote] = useState(initialNote)
  const [suggestionEnabled, setSuggestionEnabled] = useState(true)
  const [items, setItems] = useState<DraftItem[]>([])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items]
  )

  const emit = (nextItems = items, nextNote = note, nextSuggestion = suggestionEnabled) => {
    const payload: MilestonePlanDraftPayload | null =
      nextItems.length === 0
        ? null
        : {
            note: nextNote,
            suggestion_enabled: nextSuggestion,
            items: nextItems.map(({ id, ...rest }) => rest),
          }

    onChange?.(payload)
  }

  const addItem = () => {
    setItems((curr) => {
      const next = [...curr, makeItem(curr.length + 1)]
      emit(next)
      return next
    })
  }

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((curr) => {
      const next = curr.map((item) => (item.id === id ? { ...item, ...patch } : item))
      emit(next)
      return next
    })
  }

  const removeItem = (id: string) => {
    setItems((curr) => {
      const next = curr
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, order: index + 1 }))
      emit(next)
      return next
    })
  }

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems((curr) => {
      const index = curr.findIndex((item) => item.id === id)
      if (index < 0) return curr
      const swap = direction === 'up' ? index - 1 : index + 1
      if (swap < 0 || swap >= curr.length) return curr

      const next = [...curr]
      const [moved] = next.splice(index, 1)
      next.splice(swap, 0, moved)
      const normalized = next.map((item, index2) => ({ ...item, order: index2 + 1 }))
      emit(normalized)
      return normalized
    })
  }

  const toggleSuggestions = () => {
    if (items.length === 0) return
    const next = !suggestionEnabled
    setSuggestionEnabled(next)
    emit(items, note, next)
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Milestone split</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {splitOwner === 'CLIENT'
                ? 'You are creating the split yourself. Freelancers will see it before bidding.'
                : 'Freelancers will propose the split later in their bid.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">{items.length} items</Badge>
            <Badge variant="outline">{total.toLocaleString('fr-DZ')} DZD</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={items.length > 0 && suggestionEnabled ? 'default' : 'outline'}
            onClick={toggleSuggestions}
            disabled={items.length === 0}
          >
            <SparklesIcon className="mr-2 h-4 w-4" />
            Suggestions {suggestionEnabled ? 'on' : 'off'}
          </Button>

          {items.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              Add at least one milestone to enable suggestions.
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Plan note</Label>
          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              emit(items, e.target.value, suggestionEnabled)
            }}
            placeholder="Optional note for freelancers..."
            rows={3}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No milestone items yet.</p>
            <Button type="button" className="mt-4" onClick={addItem}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add first milestone
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <Badge variant="outline">{item.source.toLowerCase()}</Badge>
                    {item.can_be_suggested ? <Badge>suggestable</Badge> : <Badge variant="destructive">locked</Badge>}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(item.id, 'up')} disabled={index === 0}>
                      <ArrowUpIcon className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(item.id, 'down')} disabled={index === items.length - 1}>
                      <ArrowDownIcon className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      placeholder="e.g. Discovery phase"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={item.due_date}
                      onChange={(e) => updateItem(item.id, { due_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.order}
                      onChange={(e) => updateItem(item.id, { order: Math.max(1, Number(e.target.value || 1)) })}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
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
          <p className="text-sm text-muted-foreground">
            Total milestone amount: <span className="font-medium text-foreground">{total.toLocaleString('fr-DZ')} DZD</span>
          </p>

          <Button type="button" variant="outline" onClick={addItem}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}