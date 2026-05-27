'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { auth } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const { t } = useLocale()
  const router = useRouter()

  const [form, setForm] = useState({
    username: '', email: '', password: '', password2: '',
  })
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await auth.register(form)
      // No tokens — user must verify email first
      router.push(`/auth/check-email?email=${encodeURIComponent(form.email)}`)
    } catch (err: any) {
      const data = err?.response?.data ?? {}
      const mapped: Record<string, string> = {}
      Object.entries(data).forEach(([k, v]) => {
        mapped[k] = Array.isArray(v) ? v[0] : String(v)
      })
      setErrors(mapped)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight">
            Free<span className="text-blue-500">wise</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">{t.auth.register.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t.auth.register.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { id: 'username', label: t.auth.register.username, type: 'text',     auto: 'username' },
                { id: 'email',    label: t.auth.register.email,    type: 'email',    auto: 'email' },
                { id: 'password', label: t.auth.register.password, type: 'password', auto: 'new-password' },
                { id: 'password2',label: t.auth.register.password2,type: 'password', auto: 'new-password' },
              ].map(({ id, label, type, auto }) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id} name={id} type={type}
                    value={form[id as keyof typeof form]}
                    onChange={handleChange}
                    autoComplete={auto}
                    required
                  />
                  {errors[id] && <p className="text-xs text-destructive">{errors[id]}</p>}
                </div>
              ))}

              {errors.non_field_errors && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {errors.non_field_errors}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.common.loading : t.auth.register.submit}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t.auth.register.haveAccount}{' '}
              <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                {t.auth.register.loginLink}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}