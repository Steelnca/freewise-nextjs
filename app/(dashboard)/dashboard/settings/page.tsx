
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale, type Locale } from '@/context/locale-context'
import { accounts as accountsApi, auth as authApi } from '@/lib/api'
import { tokens } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircleIcon, ShieldIcon, GlobeIcon, Link } from 'lucide-react'
import { ROUTES } from '@/lib/routes'

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English', fr: 'Français', ar: 'العربية',
}

export default function SettingsPage() {
  const { account, setAccount, setMode } = useMode()
  const { t, locale, setLocale }         = useLocale()

  const [saving,   setSaving]   = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [form, setForm] = useState({
    bio:      '',
    country:  '',
    birthday: '',
    phone:    '',
  })

  useEffect(() => {
    if (!account) return
    setForm({
      bio:      account.bio      ?? '',
      country:  account.country  ?? '',
      birthday: account.birthday ?? '',
      phone:    account.phone    ?? '',
    })
  }, [account])

  const set = (key: string, value: string) =>
    setForm(p => ({ ...p, [key]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await accountsApi.update(form as any)
      setAccount(r.data)
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleActivateRole = async (role: 'client' | 'freelancer') => {
    setActivating(role)
    try {
      await accountsApi.activateRole(role)
      const r = await authApi.me()
      setAccount(r.data)
      setMode(role)
      toast.success(`${role === 'client' ? 'Client' : 'Freelancer'} role activated!`)
    } catch {
      toast.error('Failed to activate role.')
    } finally {
      setActivating(null)
    }
  }

  const handleForgotPassword = () => {
    // For simplicity, we'll just redirect to a forgot password page.
    // In a real app, you might want to handle this in a modal or separate component.
    window.location.href = ROUTES.auth.forgotPassword
    return
    // setShowForgotPassword(true)
    // <ForgotPasswordModal open={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
  }

  const handleChangePassword = () => {
    // For simplicity, we'll just redirect to a change password page.
    // In a real app, you might want to handle this in a modal or separate component.
    window.location.href = ROUTES.dashboard.settings.changePassword
    return
    // setShowChangePassword(true)
    // <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} />
  }

  if (!account) return null

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile picture + identity */}
      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={account.avatar ?? undefined} />
              <AvatarFallback className="text-xl bg-blue-100 text-blue-700 font-bold">
                {account.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{account.username}</p>
              <p className="text-sm text-muted-foreground">{account.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Member since {new Date(account.joined_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Tell others about yourself..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                  placeholder="Algeria"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={form.birthday}
                  onChange={e => set('birthday', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+213 XX XX XX XX"
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GlobeIcon className="w-4 h-4" /> Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['en', 'fr', 'ar'] as Locale[]).map(l => (
              <Button
                key={l}
                variant={l === locale ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocale(l)}
                className="flex-1"
              >
                {LOCALE_LABELS[l]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldIcon className="w-4 h-4" /> Active Roles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'client' as const,     label: 'Client',     description: 'Post jobs and hire freelancers' },
            { key: 'freelancer' as const, label: 'Freelancer', description: 'Offer services and bid on jobs' },
          ].map(({ key, label, description }) => {
            const isActive = key === 'client' ? account.is_client : account.is_freelancer
            return (
              <div key={key} className="flex items-center justify-between gap-4 p-4 rounded-xl border">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{label}</p>
                    {isActive && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                {!isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activating === key}
                    onClick={() => handleActivateRole(key)}
                  >
                    {activating === key ? t.common.loading : 'Activate'}
                  </Button>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldIcon className="w-4 h-4" /> Account Security
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Manage your account security settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'forgot-password' as const,     label: 'Forgot Password',     description: 'Reset your password if you forgot it.' },
            { key: 'change-password' as const, label: 'Change Password', description: 'Update your account password to a new one.' },

          ].map(({ key, label, description }) => {
            return (
              <div key={key} className="flex items-center justify-between gap-4 p-4 rounded-xl border">
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (key === 'forgot-password') {
                      handleForgotPassword()
                    } else {
                      handleChangePassword()
                    }
                  }}
                >
                  {key === 'forgot-password' ? 'Reset Password' : 'Update Password'}
                </Button>

              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Log out of all devices</p>
              <p className="text-xs text-muted-foreground">This will invalidate all your active sessions.</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const refresh = tokens.getRefresh()
                if (refresh) {
                  import('@/lib/api').then(({ auth }) => auth.logout(refresh).catch(() => {}))
                }
                tokens.clear()
                window.location.href = '/'
              }}
            >
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}