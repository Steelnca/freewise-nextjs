'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { tokens } from '@/lib/auth'
import { auth, accounts } from '@/lib/api'
import { useLocale } from '@/context/locale-context'
import type { Account } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BriefcaseIcon, BuildingIcon, ArrowRightIcon } from 'lucide-react'

export default function DashboardPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!tokens.isLoggedIn()) { router.push('/login'); return }
    auth.me().then(r => {
      const acc = r.data
      setAccount(acc)
      // redirect if already has a role
      if (acc.is_client)     router.replace('/dashboard/client')
      if (acc.is_freelancer) router.replace('/dashboard/freelancer')
    }).catch(() => { tokens.clear(); router.push('/login') })
  }, [])

  const activate = async (role: 'client' | 'freelancer') => {
    setLoading(role)
    try {
      await accounts.activateRole(role)
      toast.success(role === 'client' ? 'Client role activated!' : 'Freelancer role activated!')
      router.push(role === 'client' ? '/dashboard/client' : '/dashboard/freelancer')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  if (!account) return null

  const roles = [
    {
      key:         'client' as const,
      icon:        BuildingIcon,
      title:       t.dashboard.activateClient,
      description: 'Post jobs, review offers, and hire talented Algerian freelancers for your projects.',
      color:       'from-blue-500 to-brand-600',
    },
    {
      key:         'freelancer' as const,
      icon:        BriefcaseIcon,
      title:       t.dashboard.activateFreelancer,
      description: 'Browse jobs, submit offers, and get paid securely through escrow.',
      color:       'from-brand-500 to-teal-500',
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            {t.dashboard.welcome.replace('{name}', account.username)} 👋
          </h1>
          <p className="text-muted-foreground">{t.dashboard.chooseRole}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {roles.map(({ key, icon: Icon, title, description, color }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all duration-200 group"
                onClick={() => activate(key)}
              >
                <CardContent className="p-6 space-y-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
                  </div>
                  <Button
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                    variant="outline"
                    disabled={loading === key}
                  >
                    {loading === key ? t.common.loading : (
                      <span className="flex items-center gap-2">
                        {title} <ArrowRightIcon className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can activate both roles later from your dashboard settings.
        </p>
      </div>
    </div>
  )
}