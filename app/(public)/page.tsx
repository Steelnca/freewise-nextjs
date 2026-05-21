'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useLocale } from '@/context/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRightIcon, ShieldCheckIcon, ZapIcon, UsersIcon, StarIcon } from 'lucide-react'

const CATEGORIES = [
  { icon: '💻', en: 'Development',   fr: 'Développement', ar: 'برمجة وتطوير' },
  { icon: '🎨', en: 'Design',        fr: 'Design',        ar: 'تصميم وإبداع' },
  { icon: '📣', en: 'Marketing',     fr: 'Marketing',     ar: 'تسويق رقمي'   },
  { icon: '✍️', en: 'Writing',       fr: 'Rédaction',     ar: 'كتابة ومحتوى' },
  { icon: '🎬', en: 'Video & Audio', fr: 'Vidéo & Audio', ar: 'فيديو وصوت'   },
  { icon: '📊', en: 'Business',      fr: 'Business',      ar: 'إدارة أعمال'  },
]

export default function HomePage() {
  const { t, locale } = useLocale()

  const catName = (c: typeof CATEGORIES[number]) =>
    locale === 'ar' ? c.ar : locale === 'fr' ? c.fr : c.en

  const trustItems = [
    { icon: ShieldCheckIcon, text: locale === 'ar' ? 'مدفوعات مؤمّنة بالضمان' : locale === 'fr' ? 'Paiements sécurisés par escrow' : 'Escrow-secured payments' },
    { icon: ZapIcon,         text: locale === 'ar' ? 'EDAHABIA & CIB'          : locale === 'fr' ? 'EDAHABIA & CIB acceptés'       : 'EDAHABIA & CIB accepted'    },
    { icon: UsersIcon,       text: locale === 'ar' ? 'مستقلون جزائريون'        : locale === 'fr' ? 'Talents algériens'             : 'Algerian talent pool'       },
    { icon: StarIcon,        text: locale === 'ar' ? 'نظام تقييم موثوق'        : locale === 'fr' ? 'Avis vérifiés'                : 'Verified reviews'           },
  ]

  return (
    <div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="container-fw relative py-24 md:py-36 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {t.home.badge}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl">
            {t.home.title}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 text-lg text-blue-100 max-w-xl leading-relaxed">
            {t.home.subtitle}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50" asChild>
              <Link href="/register">{t.home.ctaClient} <ArrowRightIcon className="w-4 h-4 ml-2" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white" asChild>
              <Link href="/jobs">{t.home.ctaFreelancer}</Link>
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-16 flex flex-wrap gap-10">
            {[{ value: '2,400+', label: t.home.stats.freelancers }, { value: '890+', label: t.home.stats.jobs }, { value: '45M', label: t.home.stats.secured }].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-blue-300 text-sm mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b bg-white">
        <div className="container-fw py-5 flex flex-wrap justify-center gap-8">
          {trustItems.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Icon className="w-4 h-4 text-blue-500" /> {text}
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container-fw py-20">
        <h2 className="text-3xl font-bold tracking-tight mb-10">{t.home.categoriesTitle}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <Link key={cat.en} href={`/jobs?category=${cat.en.toLowerCase()}`} className="group">
              <Card className="text-center hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardContent className="p-5 space-y-2">
                  <span className="text-3xl block">{cat.icon}</span>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-blue-600 transition-colors">{catName(cat)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 border-y">
        <div className="container-fw py-20">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-16">{t.home.howTitle}</h2>
          <div className="grid md:grid-cols-2 gap-12 max-w-3xl mx-auto">
            {[{ data: t.home.client }, { data: t.home.freelancer }].map(({ data }, idx) => (
              <div key={idx}>
                <h3 className="font-bold text-lg text-blue-600 mb-6">{data.title}</h3>
                <ol className="space-y-4">
                  {data.steps.map((step:any, i:any) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-muted-foreground pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-fw py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-xl mx-auto">{t.home.readyTitle}</h2>
        <p className="text-muted-foreground mt-4 max-w-md mx-auto">{t.home.readySubtitle}</p>
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Button size="lg" asChild><Link href="/register">{t.nav.register}</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/jobs">{t.nav.findWork}</Link></Button>
        </div>
      </section>
    </div>
  )
}