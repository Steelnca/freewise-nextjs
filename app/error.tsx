'use client';

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircleIcon } from 'lucide-react'

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <XCircleIcon className="h-6 w-6 text-red-500" />
            <div>
              <h2 className="font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
        <Link href="/" passHref>
          <Button variant="outline">Go back home</Button>
        </Link>
      </div>
    </div>
  )
}

