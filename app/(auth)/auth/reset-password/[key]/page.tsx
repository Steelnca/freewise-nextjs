
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
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
import { ROUTES } from '@/lib/routes'

export default function ResetPasswordPage() {
  const params = useParams<{ key?: string }>()
  const router = useRouter()

  const key = useMemo(() => {
    const raw = params?.key || ''
    try {
      return decodeURIComponent(raw)
    } catch {
      return ''
    }
  }, [params?.key])

  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    if (!key.trim()) {
      setPageError('Invalid reset link.')
    }
  }, [key])

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!key.trim()) {
      setPageError('Invalid reset link.')
      return
    }

    if (password1 !== password2) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await auth.resetPassword(key, password1, password2)

      toast.success(response.data.detail || 'Password reset successfully.')
      router.push(ROUTES.dashboard.root)

    } catch (err: any) {
      const data = err?.response?.data

      const detail =
        data?.detail ||
        (typeof data === 'string' ? data : '') ||
        'Invalid or expired reset link.'

      setError(detail)
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  if (pageError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-md border bg-card shadow-sm rounded-2xl">
          <CardHeader className="space-y-3">
            <Link href="/" className="inline-flex w-fit items-center text-2xl font-semibold tracking-tight">
              Free
              <span className="text-blue-600">wise</span>
            </Link>

            <div className="space-y-1">
              <CardTitle className="text-xl">Reset password</CardTitle>
              <CardDescription>
                {pageError}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex items-center justify-between text-sm">
            <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
              Request a new link
            </Link>

            <Button onClick={() => router.back()} className="text-muted-foreground hover:underline">
              Back
            </Button>
          </CardContent>
        </Card>
      </main>
    )
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
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>
              Pick something strong. Then use it to sign back in.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password1">New password</Label>
              <Input
                id="password1"
                name="password1"
                type="password"
                autoComplete="new-password"
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password2">Confirm password</Label>
              <Input
                id="password2"
                name="password2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Reset password'}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
                Request new link
              </Link>

              <Button onClick={() => router.back()} className="text-muted-foreground hover:underline">
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}