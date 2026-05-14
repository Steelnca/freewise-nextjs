
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useMode } from '@/context/mode-context'
import { useLocale } from '@/context/locale-context'
import { collabs as collabsApi } from '@/lib/api'
import type { CollabPost } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { PlusIcon, SearchIcon, UsersIcon, CalendarIcon } from 'lucide-react'

export default function CollabsPage() {
  const { mode, account } = useMode()
  const { t }             = useLocale()

  const [posts,       setPosts]       = useState<CollabPost[]>([])
  const [search,      setSearch]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const [createOpen,  setCreateOpen]  = useState(false)
  const [applyTarget, setApplyTarget] = useState<CollabPost | null>(null)
  const [submitting,  setSubmitting]  = useState(false)

  const [createForm, setCreateForm] = useState({
    title: '', description: '', spots: '1',
  })
  const [applyMessage, setApplyMessage] = useState('')

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await collabsApi.create({
        title:       createForm.title,
        description: createForm.description,
        spots:       Number(createForm.spots),
      } as any)
      toast.success('Collab post created!')
      setCreateOpen(false)
      setCreateForm({ title: '', description: '', spots: '1' })
      fetchPosts()
    } catch {
      toast.error('Failed to create collab post.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApply = async () => {
    if (!applyTarget) return
    setSubmitting(true)
    try {
      await collabsApi.apply(applyTarget.id, { message: applyMessage })
      toast.success('Application submitted!')
      setApplyTarget(null)
      setApplyMessage('')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to apply.')
    } finally {
      setSubmitting(false)
    }
  }

  const isFreelancer = mode === 'freelancer'

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collabs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isFreelancer
              ? 'Find freelancers to collaborate with on your projects'
              : 'Browse collaboration opportunities from freelancers'}
          </p>
        </div>
        {isFreelancer && (
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-2" /> Post Collab
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search collab posts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Posts */}
      {loading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <UsersIcon className="w-7 h-7 text-blue-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">No collab posts yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isFreelancer
                  ? 'Post a collab to find other freelancers to work with on your projects.'
                  : 'Check back later for collaboration opportunities.'}
              </p>
            </div>
            {isFreelancer && (
              <Button onClick={() => setCreateOpen(true)}>Post Collab</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
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
                        {post.member_count > 0 && (
                          <span>{post.member_count} member{post.member_count !== 1 ? 's' : ''}</span>
                        )}
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

                    {/* Actions */}
                    <div className="shrink-0">
                      {isFreelancer && post.posted_by_username !== account?.username && (
                        <Button size="sm" onClick={() => setApplyTarget(post)}>
                          Apply
                        </Button>
                      )}
                      {post.posted_by_username === account?.username && (
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                          Your post
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create collab dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post a Collab</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Find other freelancers to collaborate with on your project.
            </p>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="collab-title">Title *</Label>
                <Input
                  id="collab-title"
                  value={createForm.title}
                  onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Looking for a UI designer for my web app"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collab-desc">Description *</Label>
                <textarea
                  id="collab-desc"
                  value={createForm.description}
                  onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the project, what role you need, expected time commitment..."
                  rows={4}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spots">Spots needed</Label>
                <Input
                  id="spots"
                  type="number"
                  min={1}
                  max={10}
                  value={createForm.spots}
                  onChange={e => setCreateForm(p => ({ ...p, spots: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t.common.loading : 'Post Collab'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Apply dialog */}
      <Dialog open={!!applyTarget} onOpenChange={open => !open && setApplyTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply to Collab</DialogTitle>
            {applyTarget && (
              <p className="text-sm text-muted-foreground pt-1">{applyTarget.title}</p>
            )}
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Message *</Label>
            <textarea
              value={applyMessage}
              onChange={e => setApplyMessage(e.target.value)}
              placeholder="Introduce yourself and explain how you can contribute to this project..."
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyTarget(null)}>{t.common.cancel}</Button>
            <Button onClick={handleApply} disabled={submitting || !applyMessage.trim()}>
              {submitting ? t.common.loading : 'Send Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}