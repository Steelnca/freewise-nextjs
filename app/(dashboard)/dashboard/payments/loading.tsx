
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-8 w-40 rounded bg-muted animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-2xl bg-muted animate-pulse" />
        <div className="h-28 rounded-2xl bg-muted animate-pulse" />
        <div className="h-28 rounded-2xl bg-muted animate-pulse" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-2xl bg-muted animate-pulse" />
        <div className="h-80 rounded-2xl bg-muted animate-pulse" />
      </div>
    </main>
  )
}