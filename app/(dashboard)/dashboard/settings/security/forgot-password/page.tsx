
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { auth } from '@/lib/api'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

export default function SecurityForgotPasswordPage() {
  const [loading, setLoading] =
    useState(false)

  const [sent, setSent] =
    useState(false)

  const handleSend = async () => {
    setLoading(true)

    try {
      const response =
        await auth.authenticatedForgotPassword()

      toast.success(
        response.data.detail
      )

      setSent(true)
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ||
          'Failed to send reset email.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>
            Forgot current password
          </CardTitle>

          <CardDescription>
            We&apos;ll send a password reset
            link to your account email.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            Use this option if you no longer
            remember your current password.
            You&apos;ll receive an email with
            instructions to create a new one.
          </div>

          <Button
            onClick={handleSend}
            disabled={loading || sent}
          >
            {loading ? 'Sending...' : sent ? 'Reset Link Sent' : 'Send Reset Link'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}