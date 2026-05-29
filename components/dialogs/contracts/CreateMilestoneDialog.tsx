
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

import { contracts } from '@/lib/api'

interface CreateMilestoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  contractId: number

  onCreated?: () => void
}

export default function CreateMilestoneDialog({
  open,
  onOpenChange,
  contractId,
  onCreated,
}: CreateMilestoneDialogProps) {
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [order, setOrder] = useState('1')

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setAmount('')
    setDueDate('')
    setOrder('1')
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Milestone title is required.')
      return
    }

    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount.')
      return
    }

    if (!dueDate) {
      toast.error('Please select a due date.')
      return
    }

    setLoading(true)

    try {
      await contracts.createMilestone(contractId, {
        title: title.trim(),
        description: description.trim(),
        amount,
        due_date: dueDate,
        order: Number(order),
      })

      toast.success('Milestone created successfully.')

      resetForm()

      onOpenChange(false)

      onCreated?.()
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
        'Failed to create milestone.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create milestone</DialogTitle>

          <DialogDescription>
            Split the contract into structured delivery phases before funding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="milestone-title">
              Title
            </Label>

            <Input
              id="milestone-title"
              placeholder="Homepage UI implementation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-description">
              Description
            </Label>

            <Textarea
              id="milestone-description"
              placeholder="Describe the scope and expected deliverables..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="milestone-amount">
                Amount (DZD)
              </Label>

              <Input
                id="milestone-amount"
                type="number"
                min="1"
                step="1"
                placeholder="15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-order">
                Order
              </Label>

              <Input
                id="milestone-order"
                type="number"
                min="1"
                step="1"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-due-date">
              Due date
            </Label>

            <Input
              id="milestone-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create milestone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}