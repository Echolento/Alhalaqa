import { redirect } from 'next/navigation'

export default async function PaymentsLegacyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  redirect(month ? `/dashboard?month=${month}` : '/dashboard')
}
