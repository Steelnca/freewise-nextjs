
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { XCircleIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PaymentFailurePage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/dashboard/contracts'), 8000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto"
        >
          <XCircleIcon className="w-10 h-10 text-red-600" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Payment Failed</h1>
          <p className="text-muted-foreground">
            Something went wrong with your payment. No funds have been charged. Please try again.
          </p>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-left space-y-1">
          <p className="font-semibold text-red-800">Common reasons:</p>
          <ul className="space-y-1 text-red-700 mt-2">
            <li>• Insufficient funds on your card</li>
            <li>• Card details entered incorrectly</li>
            <li>• Bank declined the transaction</li>
            <li>• Session expired — please try again</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/dashboard/contracts">
              <RefreshCwIcon className="w-4 h-4 mr-2" /> Try Again
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Redirecting in 8 seconds...</p>
      </motion.div>
    </div>
  )
}