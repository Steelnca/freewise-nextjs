
// Make skeleton component for loading states. This will be used in the dashboard layout while we're waiting for auth.me to return, so we don't flash the wrong UI while we're waiting

export const Skeleton = () => {
  return (
    <div className="animate-pulse flex space-x-4">
      <div className="flex-1 space-y-6 py-1">
        <div className="h-2 bg-muted rounded"></div>
        <div className="h-2 bg-muted rounded"></div>
        <div className="h-2 bg-muted rounded"></div>
      </div>
    </div>
  )
}