
'use client';

import { Card, CardContent } from '@/components/ui/card'
import { LoaderIcon } from 'lucide-react'

export default function DashboardLoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <LoaderIcon className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-semibold">Loading...</h2>
              <p className="text-sm text-muted-foreground">
                Please wait while we load your dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
