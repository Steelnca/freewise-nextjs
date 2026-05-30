
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
import { contracts as contractsApi } from '@/lib/api'

interface SubmitWorkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  milestoneId: number
  onSubmitted?: () => void
}

export default function SubmitWorkDialog({
  open,
  onOpenChange,
  milestoneId,
  onSubmitted,
}: SubmitWorkDialogProps) {
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [submissionLink, setSubmissionLink] = useState('')

  const resetForm = () => {
    setNote('')
    setSubmissionLink('')
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await contractsApi.submitMilestone(milestoneId, {
        note: note.trim(),
        submission_link: submissionLink.trim(),
      })

      toast.success('Work submitted successfully.')
      resetForm()
      onOpenChange(false)
      onSubmitted?.()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to submit work.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit work</DialogTitle>
          <DialogDescription>
            Add a short summary and a link to the deliverable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="submission-note">Summary</Label>
            <Textarea
              id="submission-note"
              placeholder="What did you complete?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submission-link">Deliverable link</Label>
            <Input
              id="submission-link"
              placeholder="https://..."
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit work'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}