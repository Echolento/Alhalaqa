import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-center">
        <Skeleton className="h-11 w-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        <Card className="border shadow-sm">
          <CardContent className="p-4 md:p-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 md:p-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-none shadow-md">
            <CardContent className="p-3 md:p-5 flex items-center gap-3">
              <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-[44px] w-[120px] rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
