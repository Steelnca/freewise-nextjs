'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { auth } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MailIcon, RefreshCwIcon } from 'lucide-react'

export default function CheckEmailPage() {
  const { t }         = useLocale()
  const searchParams  = useSearchParams()
  const COOLDOWN = 60 // email resent cooldown in seconds
  const [resending, setResending] = useState(false)
  const [resent,    setResent]    = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN)

  const email = decodeURIComponent(searchParams.get('email') || "")

  useEffect(() => {
    if (secondsLeft <= 0) {
      // cooldown finished
      setSecondsLeft(0)
      return
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [secondsLeft])

  useEffect(() => {
    if (secondsLeft === 0 && resent) {
      // allow UI to show success but clear resent flag if you prefer the button-only behaviour
      // setResent(false)
    }
  }, [secondsLeft, resent])

  const handleResend = async () => {
    if (!email) {
      toast.error('No email provided to resend verification.')
      return
    }

    // Prevent manual spam if cooldown active
    if (secondsLeft > 0) return

    setResending(true)
    try {
      // save response into const to show backend message if needed
      const response = await auth.resendVerification(email)
      setResent(true)
      setSecondsLeft(COOLDOWN)
      // i wanna show the backend success message
      toast.success(response.data.detail || 'Verification email resent successfully. Please check your inbox.')
    } catch (err) {
      const errorMessage =
        (err as any)?.response?.data?.detail ??
        'Failed to resend verification email. Please try again later.'
      toast.error(errorMessage)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight">
            Free<span className="text-blue-500">wise</span>
          </Link>
        </div>

        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <MailIcon className="w-8 h-8 text-blue-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We sent a verification link to{' '}
                {email && <span className="font-semibold text-foreground">{email}</span>}
                {!email && 'your email address'}.
                Click the link to activate your account.
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Didn't receive it?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>The link expires after 24 hours</li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled={resending || secondsLeft > 0}
              onClick={handleResend}
            >
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
              {resending
                ? t.common.loading
                : secondsLeft > 0
                ? `Resend available in ${secondsLeft}s`
                : 'Resend verification email'}
            </Button>

            <p className="text-sm text-muted-foreground">
              Already verified?{' '}
              <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                {t.auth.login.submit}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}