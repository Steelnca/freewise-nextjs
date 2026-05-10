
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { contracts as contractsApi, payments } from '@/lib/api'
import type { Contract } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CalendarIcon, ShieldCheckIcon, ArrowRightIcon } from 'lucide-react'

const STATUS_CLS: Record<string, string> = {
  ACTIVE:    'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DISPUTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export default function ContractsPage() {
  const { mode }          = useMode()
  const { t }             = useLocale()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    contractsApi.list().then(r => setContracts(r.data)).finally(() => setLoading(false))
  }, [])

  const handleFundMilestone = async (milestoneId: number) => {
    try {
      const { data } = await payments.fundMilestone(milestoneId)
      window.location.href = data.checkout_url
    } catch {
      toast.error('Failed to initiate payment.')
    }
  }

  const handleSubmitMilestone = async (milestoneId: number) => {
    try {
      await contractsApi.submitMilestone(milestoneId)
      toast.success('Milestone submitted for review!')
      contractsApi.list().then(r => setContracts(r.data))
    } catch {
      toast.error('Failed to submit milestone.')
    }
  }

  const handleApproveMilestone = async (milestoneId: number) => {
    try {
      await contractsApi.approveMilestone(milestoneId)
      toast.success('Milestone approved! Payout queued.')
      contractsApi.list().then(r => setContracts(r.data))
    } catch {
      toast.error('Failed to approve milestone.')
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground text-sm mt-1">{contracts.length} contracts</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : contracts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">No contracts yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map(contract => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{contract.job_title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[contract.status]}`}>
                        {contract.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mode === 'client' ? `with ${contract.freelancer_username}` : `with ${contract.client_username}`}
                      {' · '}
                      <span className="font-medium text-foreground">
                        {parseFloat(contract.agreed_price).toLocaleString('fr-DZ')} DZD
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <CalendarIcon className="w-3 h-3" />
                      Deadline: {new Date(contract.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-2">
                  {contract.milestones.map(milestone => (
                    <div key={milestone.id} className="flex items-center justify-between gap-3 bg-muted/50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ShieldCheckIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{milestone.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {parseFloat(milestone.amount).toLocaleString('fr-DZ')} DZD
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          milestone.status === 'FUNDED'    ? 'bg-blue-100 text-blue-700'   :
                          milestone.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-700':
                          milestone.status === 'APPROVED'  ? 'bg-green-100 text-green-700' :
                          milestone.status === 'RELEASED'  ? 'bg-green-100 text-green-700' :
                          milestone.status === 'DISPUTED'  ? 'bg-red-100 text-red-700'     :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {milestone.status}
                        </span>
                        {/* Client actions */}
                        {mode === 'client' && milestone.status === 'PENDING' && (
                          <Button size="sm" onClick={() => handleFundMilestone(milestone.id)}>
                            Fund Escrow
                          </Button>
                        )}
                        {mode === 'client' && milestone.status === 'SUBMITTED' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApproveMilestone(milestone.id)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => contractsApi.disputeMilestone(milestone.id).then(() => toast.success('Dispute opened.'))}>
                              Dispute
                            </Button>
                          </div>
                        )}
                        {/* Freelancer actions */}
                        {mode === 'freelancer' && milestone.status === 'FUNDED' && (
                          <Button size="sm" onClick={() => handleSubmitMilestone(milestone.id)}>
                            Submit Work
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}