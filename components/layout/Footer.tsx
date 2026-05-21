
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container-fw py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link href="/" className="font-bold text-foreground">
          Free<span className="text-blue-500">wise</span>
        </Link>
        <span>© {new Date().getFullYear()} Freewise</span>
      </div>
    </footer>
  )
}