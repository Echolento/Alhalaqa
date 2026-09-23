import { getTeacherProofQueue } from '@/lib/payment-proofs'
import { getUnpaidQueue, getProofReceipt } from '@/lib/payment-proof-verdict'
import { UNPAID_COPY } from '@/lib/unpaid-queue-copy'
import { UnpaidQueue } from '@/components/unpaid/unpaid-queue'
import { Card, CardContent } from '@/components/ui/card'

// Frozen Unpaid-queue URL contract (see unpaidQueueItemUrl in
// lib/push-payloads.ts): /dashboard/unpaid?receipt=<id>. The receipt param
// deep-links + highlights a single proof; the optional student param scopes
// the list via getTeacherProofQueue (read-only reuse, never modified).
export default async function UnpaidPage({
  searchParams,
}: {
  searchParams: Promise<{ receipt?: string; student?: string }>
}) {
  const { receipt: highlightReceiptId, student: studentFilter } = await searchParams

  const [global, teacherScoped] = await Promise.all([
    getUnpaidQueue(),
    studentFilter ? getTeacherProofQueue(studentFilter) : Promise.resolve(null),
  ])

  if (teacherScoped && (teacherScoped as { error?: string }).error) {
    const msg = (teacherScoped as { error: string }).error
    return (
      <div className="mx-auto w-full max-w-2xl p-4" dir="rtl">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {msg === 'Unauthorized'
              ? UNPAID_COPY.unauthorized
              : msg === 'Forbidden'
                ? UNPAID_COPY.forbidden
                : msg}
          </CardContent>
        </Card>
      </div>
    )
  }

  if ((global as { error?: string }).error && !teacherScoped) {
    const msg = (global as { error: string }).error
    return (
      <div className="mx-auto w-full max-w-2xl p-4" dir="rtl">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {msg === 'Unauthorized'
              ? UNPAID_COPY.unauthorized
              : msg === 'Forbidden'
                ? UNPAID_COPY.forbidden
                : UNPAID_COPY.loadError}
          </CardContent>
        </Card>
      </div>
    )
  }

  let items =
    ((global as { items?: Array<{
      id: string
      studentId: string
      studentName: string
      periodKey: string
      storagePath: string
      imageUrl: string | null
      createdAt: string
    }> }).items ?? []).slice()

  // Student-scoped reuse: restrict the enriched global list to proofs the
  // per-student teacher queue returns (pending only). Keeps screenshots
  // (signed URLs) while honouring the read-only getTeacherProofQueue import.
  if (teacherScoped && (teacherScoped as { proofs?: Array<{ id: string; status: string }> }).proofs) {
    const scoped = (teacherScoped as { proofs: Array<{ id: string; status: string }> }).proofs
    const pendingIds = new Set(scoped.filter((p) => p.status === 'pending').map((p) => p.id))
    items = items.filter((it) => pendingIds.has(it.id))
    // Proofs known to the per-student queue but missing from the global
    // snapshot (race / pagination) still surface, without screenshots.
    const knownIds = new Set(items.map((it) => it.id))
    for (const p of scoped.filter((q) => q.status === 'pending' && !knownIds.has(q.id))) {
      const full = p as unknown as {
        id: string
        student_id?: string
        period_key?: string
        storage_path?: string
        created_at?: string
      }
      items.push({
        id: full.id,
        studentId: String(full.student_id ?? studentFilter ?? ''),
        studentName: 'طالب',
        periodKey: String(full.period_key ?? ''),
        storagePath: String(full.storage_path ?? ''),
        imageUrl: null,
        createdAt: String(full.created_at ?? ''),
      })
    }
  }

  // Receipt deep-link: when ?receipt=<id> points outside the current list
  // (already verified, other student, or stale queue), fetch it directly so
  // the frozen push URL always lands on something meaningful.
  if (highlightReceiptId && !items.some((it) => it.id === highlightReceiptId)) {
    const single = await getProofReceipt(highlightReceiptId)
    const entry = (single as { proof?: {
      id: string
      student_id: string
      period_key: string
      status: string
      imageUrl?: string | null
      studentName?: string
      storage_path?: string
    } }).proof
    if (entry && entry.status === 'pending') {
      items = [
        {
          id: entry.id,
          studentId: entry.student_id,
          studentName: entry.studentName ?? 'طالب',
          periodKey: entry.period_key,
          storagePath: entry.storage_path ?? '',
          imageUrl: entry.imageUrl ?? null,
          createdAt: '',
        },
        ...items,
      ]
    }
  }

  return (
    <div className="space-y-2 pb-20">
      <h1 className="px-4 pt-2 text-2xl font-bold" dir="rtl">
        {UNPAID_COPY.pageTitle}
      </h1>
      <UnpaidQueue items={items} highlightReceiptId={highlightReceiptId ?? null} />
    </div>
  )
}
