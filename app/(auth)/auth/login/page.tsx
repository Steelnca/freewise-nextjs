'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { auth } from '@/lib/api'
import { tokens } from '@/lib/auth'
import { useLocale } from '@/context/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'

export default function LoginPage() {
  const { t } = useLocale()
  const router = useRouter()

  const [form, setForm]       = useState({ username: '', password: '' })
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data } = await auth.login(form)

      if (!data?.access || !data?.refresh) {
        throw new Error('Missing tokens in login response.')
      }

      tokens.set(data.access, data.refresh)

      const savedAccess = tokens.getAccess()
      if (!savedAccess) {
        throw new Error('Token storage failed.')
      }

      toast.success('Welcome back!')
      router.replace(ROUTES.dashboard.root)

    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sand-50)] p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight">
            Free<span className="text-[var(--brand-500)]">wise</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">{t.auth.login.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t.auth.login.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t.auth.login.username}</Label>
                <Input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.login.password}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              {errors.general && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {errors.general}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.common.loading : t.auth.login.submit}
              </Button>
            </form>

            <Link href={ROUTES.auth.forgotPassword} className="text-sm text-muted-foreground hover:underline">
              {t.auth.login.forgotPasswordLink}
            </Link>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t.auth.login.noAccount}{' '}
              <Link href={ROUTES.auth.register} className="text-[var(--brand-600)] font-semibold hover:underline">
                {t.auth.login.registerLink}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}