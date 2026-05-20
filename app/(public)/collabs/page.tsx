
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useLocale } from '@/context/locale-context'
import { collabs as collabsApi } from '@/lib/api'
import type { CollabPost } from '@/lib/types'
import Navbar from '@/components/layout/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchIcon, UsersIcon, CalendarIcon } from 'lucide-react'

export default function PublicCollabsPage() {
  const { t } = useLocale()

  const [posts,   setPosts]   = useState<CollabPost[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)

  const fetchPosts = () => {
    setLoading(true)
    collabsApi.list({ search: search || undefined })
      .then(r => setPosts(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPosts() }, [])

  useEffect(() => {
    const d = setTimeout(fetchPosts, 400)
    return () => clearTimeout(d)
  }, [search])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white">
        <div className="container-fw py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
              🤝 Collaborations
            </span>
            <h1 className="text-4xl md:text-5xl font-bold">{t.nav.collabs}</h1>
            <p className="text-blue-200 text-lg">
              Freelancers looking for collaborators on their projects. Join a team and work together.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container-fw py-4 flex gap-3">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search collabs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Posts */}
      <main className="container-fw py-10 flex-1">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <p className="text-2xl">🤝</p>
            <p className="text-muted-foreground">No collab posts yet.</p>
            <Button asChild>
              <Link href="/dashboard/collabs">Post a Collab</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">{posts.length} collab post{posts.length !== 1 ? 's' : ''}</p>
            <div className="space-y-4">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{post.title}</h3>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              {post.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{post.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span>by <span className="font-medium text-foreground">{post.posted_by_username}</span></span>
                            <span className="flex items-center gap-1">
                              <UsersIcon className="w-3 h-3" />
                              {post.spots} spot{post.spots !== 1 ? 's' : ''} needed
                            </span>
                            <span>{post.applicant_count} applicant{post.applicant_count !== 1 ? 's' : ''}</span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {post.skills_needed.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {post.skills_needed.map(skill => (
                                <span key={skill} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button size="sm" asChild>
                          <Link href={`/dashboard/collabs/${post.id}`}>View & Apply</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="container-fw py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Free<span className="text-blue-500">wise</span></span>
          <span>© {new Date().getFullYear()} Freewise</span>
        </div>
      </footer>
    </div>
  )
}