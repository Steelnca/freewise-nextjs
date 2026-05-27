
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { payments } from '@/lib/api'
import { Button } from '@/components/ui/button'

type FundMilestoneButtonProps = {
  milestoneId: number
  className?: string
}

export function FundMilestoneButton({
  milestoneId,
  className,
}: FundMilestoneButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleFund = async () => {
    setLoading(true)

    try {
      const response = await payments.fundMilestone(milestoneId)
      const checkoutUrl = response.data.checkout_url

      if (!checkoutUrl) {
        throw new Error('Checkout URL missing.')
      }

      window.location.href = checkoutUrl
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to create checkout.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      className={className}
      onClick={handleFund}
      disabled={loading}
    >
      {loading ? 'Redirecting...' : 'Fund milestone'}
    </Button>
  )
}