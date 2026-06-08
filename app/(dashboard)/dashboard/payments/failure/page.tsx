'use client'

import { useSearchParams } from 'next/navigation'

import PaymentAttemptStatusPanel from '@/components/payments/PaymentAttemptStatusPanel'

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PaymentAttemptStatusPanel
        variant="failed"
        milestonePublicId={searchParams.get('milestone')}
        contractPublicId={searchParams.get('contract')}
      />
    </main>
  )
}