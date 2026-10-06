'use client'

// components/pay/pay-upload-container.tsx
// Client wiring for the pay screen (#33 slice 5/8). Converts the chosen
// File to bytes client-side, then calls the service-role server action
// uploadPaymentProof. Kept thin so the presentational PayScreen stays
// unit-testable without server mocks.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PayScreen, type PayScreenData } from '@/components/pay/pay-screen'
import { uploadPaymentProof } from '@/lib/payment-proofs'
import { prepareReceiptFile } from '@/lib/downscale-image'
import type { PaymentProof } from '@/lib/payment-proof-validation'

/** Stays under Vercel's 4.5MB request cap and the Next Server Action limit. */
const MAX_TRANSPORT_BYTES = 4 * 1024 * 1024

export function PayUploadContainer(props: {
  studentId: string
  initialData: PayScreenData
  initialProofs: PaymentProof[]
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const router = useRouter()

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      // Phone photos exceed the caps — downscale client-side first.
      const prepared = await prepareReceiptFile(file)
      // Undecodable originals (e.g. HEIC some browsers can't draw) bypass the
      // downscale; fail clearly rather than hitting the transport body limit.
      if (prepared.sizeBytes > MAX_TRANSPORT_BYTES) {
        setUploadError('حجم الصورة كبير جدًا — اختر صورة أصغر')
        return
      }
      const result = await uploadPaymentProof({
        studentId: props.studentId,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        sizeBytes: prepared.sizeBytes,
        fileBytes: prepared.bytes,
      })
      if ((result as { error?: string }).error) {
        setUploadError((result as { error: string }).error)
      } else {
        router.refresh()
      }
    } catch {
      setUploadError('فشل رفع الإيصال — حاول مرة أخرى')
    } finally {
      setUploading(false)
    }
  }

  return (
    <PayScreen
      data={props.initialData}
      proofs={props.initialProofs}
      uploading={uploading}
      uploadError={uploadError}
      onFileSelected={handleFile}
    />
  )
}
