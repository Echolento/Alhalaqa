import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function StudentProfileLoading() {
  return (
    <div className="space-y-4 pb-20">
      <Skeleton className="h-6 w-32" />
      <Card className="border-none shadow-md">
        <CardContent className="p-4 md:p-6 flex items-center gap-3">
          <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-[44px] w-28 rounded-md" />
        </CardContent>
      </Card>
      <Card>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-primary/5">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-[44px] w-20 rounded-md" />
          </div>
        ))}
      </Card>
    </div>
  )
}
