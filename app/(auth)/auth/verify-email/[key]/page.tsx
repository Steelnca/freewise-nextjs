'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { auth } from '@/lib/api'

export default function VerifyEmailPage() {
  const params = useParams<{ key: string }>()
  const router = useRouter()

  const hasRequested = useRef(false)

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  const [message, setMessage] = useState(
    'Verifying your email...'
  )

  useEffect(() => {
    if (hasRequested.current) return
    hasRequested.current = true

    const rawKey = params?.key

    if (!rawKey) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }

    const key = decodeURIComponent(rawKey)

    if (!key.trim()) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }

    const verify = async () => {
      try {
        const res = await auth.verifyEmail(key)

        setStatus('success')
        setMessage(
          res.data.detail || 'Email verified successfully.'
        )

        setTimeout(() => {
          router.push('/auth/signin')
        }, 1500)
      } catch (err: any) {
        setStatus('error')

        setMessage(
          err?.response?.data?.detail ||
            'Invalid or expired verification link.'
        )
      }
    }

    verify()
  }, [params, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight"
          >
            Free
            <span className="text-blue-600">wise</span>
          </Link>
        </div>

        <div className="space-y-3">
          <h1 className="text-xl font-semibold">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified'}
            {status === 'error' && 'Verification Failed'}
          </h1>

          <p className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>

        {status === 'error' && (
          <div className="mt-6">
            <Link
              href="/auth/check-email"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Resend verification email
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}