'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { CheckCircleIcon, ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PaymentSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/dashboard/contracts'), 5000)
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
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto"
        >
          <CheckCircleIcon className="w-10 h-10 text-green-600" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Payment Successful</h1>
          <p className="text-muted-foreground">
            Your payment is held securely in escrow. The freelancer has been notified and will start working on your project.
          </p>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-left space-y-1">
          <p className="font-semibold text-green-800">What happens next?</p>
          <ul className="space-y-1 text-green-700 mt-2">
            <li>• Freelancer delivers the work</li>
            <li>• You review and approve the delivery</li>
            <li>• Payment is released to the freelancer</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/dashboard/contracts">
              View Contract <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Redirecting in 5 seconds...</p>
      </motion.div>
    </div>
  )
}