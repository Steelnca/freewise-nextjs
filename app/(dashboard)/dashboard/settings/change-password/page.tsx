
'use client'

import { useState } from 'react'
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
import { useRouter } from 'next/dist/client/components/navigation'
import { ROUTES } from '@/lib/routes'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword1, setNewPassword1] = useState('')
  const [newPassword2, setNewPassword2] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await auth.changePassword(
        currentPassword,
        newPassword1,
        newPassword2
      )

      toast.success(
        response.data.detail ||
          'Password updated successfully.'
      )

      setCurrentPassword('')
      setNewPassword1('')
      setNewPassword2('')

      router.push(ROUTES.dashboard.settings.root)

    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        'Failed to update password.'

      setError(detail)
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>
            Change password
          </CardTitle>

          <CardDescription>
            Update your account password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="current-password">
                Current password
              </Label>

              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">
                New password
              </Label>

              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword1}
                onChange={(e) =>
                  setNewPassword1(e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                Confirm new password
              </Label>

              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={newPassword2}
                onChange={(e) =>
                  setNewPassword2(e.target.value)
                }
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Updating...'
                : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}