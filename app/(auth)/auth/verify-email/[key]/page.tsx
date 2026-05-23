"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircleIcon, XCircleIcon, Loader2Icon } from 'lucide-react'

export default function VerifyEmailPage() {
  const params = useParams<{ key: string }>()
  const { t } = useLocale()

  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  const key = decodeURIComponent(params.key || "")

  useEffect(() => {
    auth.verifyEmail(key)
      .then(() => {
        setState('success')
      })
      .catch(err => {
        setState('error')
        setMessage(
          err?.response?.data?.detail ??
          'This link is invalid or has expired.'
        )
      })
  }, [key])

return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight">
            Free<span className="text-blue-500">wise</span>
          </Link>
        </div>

        <Card>
          <CardContent className="p-8 text-center space-y-5">

            {/* Loading */}
            {state === 'loading' && (
              <>
                <Loader2Icon className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                <div className="space-y-1">
                  <h1 className="text-xl font-bold">Verifying your email...</h1>
                  <p className="text-sm text-muted-foreground">{t.common.loading}</p>
                </div>
              </>
            )}

            {/* Success */}
            {state === 'success' && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                  <CheckCircleIcon className="w-9 h-9 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">Email verified!</h1>
                  <p className="text-sm text-muted-foreground">
                    Your account is now active. Redirecting to login...
                  </p>
                </div>
                <Button className="w-full" asChild>
                  <Link href="/login">{t.auth.login.submit}</Link>
                </Button>
              </>
            )}

            {/* Error */}
            {state === 'error' && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                  <XCircleIcon className="w-9 h-9 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">Verification failed</h1>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href="/auth/check-email">Resend email</Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href="/login">{t.auth.login.submit}</Link>
                  </Button>
                </div>
              </>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}