
import Link from 'next/link'
import { useLocale } from '@/context/locale-context'

// Server component — no 'use client' needed for simple footer
export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container-fw py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link href="/" className="font-bold text-foreground">
          Free<span className="text-blue-500">wise</span>
        </Link>
        <span>© {new Date().getFullYear()} Freewise — Algeria & beyond</span>
      </div>
    </footer>
  )
}