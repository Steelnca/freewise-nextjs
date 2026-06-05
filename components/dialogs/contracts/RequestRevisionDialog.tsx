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
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { contracts as contractsApi } from '@/lib/api'

interface RequestRevisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  milestonePublicId: string
  onRequested?: () => void
}

export default function RequestRevisionDialog({
  open,
  onOpenChange,
  milestonePublicId,
  onRequested,
}: RequestRevisionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [revisionScope, setRevisionScope] = useState('')

  const resetForm = () => {
    setNote('')
    setRevisionScope('')
  }

  const handleSubmit = async () => {
    if (!note.trim()) {
      toast.error('Please add a revision note.')
      return
    }

    setLoading(true)
    try {
      await contractsApi.requestRevisionMilestone(milestonePublicId, {
        note: note.trim(),
        revision_scope: revisionScope.trim(),
      })

      toast.success('Revision requested.')
      resetForm()
      onOpenChange(false)
      onRequested?.()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to request revision.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request revision</DialogTitle>
          <DialogDescription>
            Tell the freelancer what needs to change and how broad the revision should be.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="revision-scope">Revision scope</Label>
            <Input
              id="revision-scope"
              placeholder="Example: small fixes only, or header + footer redesign"
              value={revisionScope}
              onChange={(e) => setRevisionScope(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="revision-note">Revision note</Label>
            <Textarea
              id="revision-note"
              placeholder="What should be changed?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Request revision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}