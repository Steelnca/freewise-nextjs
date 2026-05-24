
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { auth } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await auth.forgotPassword(email)

      toast.success(
        response.data.detail ||
          'If an account exists, a reset link has been sent.'
      )

      router.push(`/auth/check-email?email=${encodeURIComponent(email)}`)
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        'Failed to send reset email. Try again later.'

      setError(detail)
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md border bg-card shadow-sm rounded-2xl">
        <CardHeader className="space-y-3">
          <Link href="/" className="inline-flex w-fit items-center text-2xl font-semibold tracking-tight">
            Free
            <span className="text-blue-600">wise</span>
          </Link>

          <div className="space-y-1">
            <CardTitle className="text-xl">Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you a reset link.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Button onClick={() => router.back()} className="text-blue-600 hover:underline">
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}