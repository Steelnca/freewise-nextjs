'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { accounts } from '@/lib/api'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BuildingIcon, BriefcaseIcon, ArrowRightIcon, CheckIcon } from 'lucide-react'

const ROLES = [
  {
    key:         'client' as const,
    icon:        BuildingIcon,
    color:       'from-blue-500 to-indigo-600',
    lightColor:  'bg-blue-50 text-blue-700',
    title:       'I want to hire',
    subtitle:    'Client',
    description: 'Post jobs, browse services, and hire talented Algerian freelancers for your projects.',
    perks:       ['Post unlimited jobs', 'Browse & order services', 'Secure escrow payments', 'Review freelancers'],
  },
  {
    key:         'freelancer' as const,
    icon:        BriefcaseIcon,
    color:       'from-teal-500 to-blue-600',
    lightColor:  'bg-teal-50 text-teal-700',
    title:       'I want to work',
    subtitle:    'Freelancer',
    description: 'Create service listings, bid on jobs, and get paid securely through escrow.',
    perks:       ['Create service listings', 'Bid on job posts', 'Secure payments', 'Build your reputation'],
  },
]

export default function ActivatePage() {
  const { t }              = useLocale()
  const { account, setAccount, setMode } = useMode()
  const router             = useRouter()
  const [selected, setSelected]   = useState<'client' | 'freelancer' | null>(null)
  const [loading,  setLoading]    = useState(false)

  const handleActivate = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await accounts.activateRole(selected)
      // Refresh account
      const { auth } = await import('@/lib/api')
      const r = await auth.me()
      setAccount(r.data)
      setMode(selected)
      toast.success(`${selected === 'client' ? 'Client' : 'Freelancer'} role activated!`)
      router.push('/dashboard')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // If already has both roles, redirect
  if (account?.is_client && account?.is_freelancer) {
    router.push('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            {account ? `Welcome, ${account.username}! 👋` : 'Get started'}
          </h1>
          <p className="text-muted-foreground">{t.dashboard.chooseRole}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {ROLES.map(({ key, icon: Icon, color, lightColor, title, subtitle, description, perks }, i) => {
            // Skip if already has this role
            if (key === 'client'     && account?.is_client)     return null
            if (key === 'freelancer' && account?.is_freelancer) return null

            const isSelected = selected === key

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <button
                  onClick={() => setSelected(key)}
                  className={`w-full text-left rounded-2xl border-2 p-6 transition-all duration-200 space-y-4 ${
                    isSelected
                      ? 'border-primary shadow-lg shadow-primary/10 bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:shadow-md'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <CheckIcon className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
                    <h2 className="text-xl font-bold mt-0.5">{subtitle}</h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
                  </div>

                  {/* Perks */}
                  <ul className="space-y-1.5">
                    {perks.map(perk => (
                      <li key={perk} className="flex items-center gap-2 text-sm">
                        <CheckIcon className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </button>
              </motion.div>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            disabled={!selected || loading}
            onClick={handleActivate}
            className="min-w-48"
          >
            {loading ? t.common.loading : (
              <span className="flex items-center gap-2">
                Continue as {selected === 'client' ? 'Client' : selected === 'freelancer' ? 'Freelancer' : '...'}
                <ArrowRightIcon className="w-4 h-4" />
              </span>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            You can activate both roles later from your dashboard settings.
          </p>
        </div>
      </div>
    </div>
  )
}