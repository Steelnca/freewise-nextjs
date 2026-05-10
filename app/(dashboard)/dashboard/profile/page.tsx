'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { freelancers as freelancersApi } from '@/lib/api'
import type { FreelancerProfile } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarIcon, BriefcaseIcon, WalletIcon } from 'lucide-react'

export default function ProfilePage() {
  const { mode }  = useMode()
  const { t }     = useLocale()
  const [profile, setProfile] = useState<FreelancerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({
    title: '', bio: '', hourly_rate: '',
    portfolio_url: '', availability: 'AVAILABLE',
  })

  useEffect(() => {
    if (mode !== 'freelancer') return
    freelancersApi.me().then(r => {
      setProfile(r.data)
      setForm({
        title:         r.data.title         ?? '',
        bio:           r.data.bio           ?? '',
        hourly_rate:   r.data.hourly_rate   ?? '',
        portfolio_url: r.data.portfolio_url ?? '',
        availability:  r.data.availability  ?? 'AVAILABLE',
      })
    }).finally(() => setLoading(false))
  }, [mode])

  if (mode !== 'freelancer') {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Switch to Freelancer mode to edit your profile.</p>
        <Button variant="outline" asChild><Link href="/dashboard">Back</Link></Button>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await freelancersApi.update(form as any)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false) }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Freelancer Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">How clients see you on Freewise</p>
      </div>

      {/* Stats */}
      {profile && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Rating',    value: `${parseFloat(profile.rating).toFixed(1)} ★`, icon: StarIcon,        color: 'text-amber-600 bg-amber-50' },
            { label: 'Completed', value: profile.completed_jobs,                       icon: BriefcaseIcon,   color: 'text-green-600 bg-green-50' },
            { label: 'Earned',    value: `${parseFloat(profile.total_earned).toLocaleString('fr-DZ')} DZD`, icon: WalletIcon, color: 'text-blue-600 bg-blue-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Edit Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label>Professional Title</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Full-Stack Developer" />
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <textarea
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell clients about your experience, skills, and what makes you stand out..."
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hourly Rate (DZD)</Label>
                <Input type="number" min={0} value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} placeholder="2500" />
              </div>
              <div className="space-y-2">
                <Label>Availability</Label>
                <Select value={form.availability} onValueChange={v => setForm(p => ({ ...p, availability: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                    <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Portfolio URL</Label>
              <Input type="url" value={form.portfolio_url} onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))} placeholder="https://your-portfolio.com" />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? t.common.loading : t.common.save}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}