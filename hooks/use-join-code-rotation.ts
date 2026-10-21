'use client'

import { useRef, useState } from 'react'
import { formatJoinCode } from '@/lib/join-codes'
import { REMIND_COPY } from '@/lib/remind-copy'

export type JoinCodeRotation = {
  code: string | null
  displayCode: string | null
  rotating: boolean
  rotateError: string | null
  rotateOk: boolean
  rotate: () => Promise<void>
}

async function currentCode(): Promise<string | null> {
  const cur = await (await import('@/lib/join-code-actions')).getMyJoinCode()
  return 'code' in cur && cur.code ? cur.code : null
}

export function useJoinCodeRotation(initialCode: string | null | undefined): JoinCodeRotation {
  const [code, setCode] = useState<string | null>(initialCode ?? null)
  const [rotating, setRotating] = useState(false)
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [rotateOk, setRotateOk] = useState(false)
  const codeRef = useRef(code)
  codeRef.current = code

  async function settleFailure(error: string) {
    // The DB may have rotated even when the response was lost. Always ask the
    // server what it holds; a different code means the rotation succeeded.
    try {
      const serverCode = await currentCode()
      if (serverCode && serverCode !== codeRef.current) {
        setCode(serverCode)
        setRotateOk(true)
        return
      }
    } catch {
      // Fall through to the failure copy.
    }
    setRotateError(error)
  }

  async function rotate() {
    setRotating(true)
    setRotateError(null)
    setRotateOk(false)
    try {
      const res = await (await import('@/lib/join-code-actions')).regenerateMyJoinCode()
      if (res.code) {
        setCode(res.code)
        setRotateOk(true)
        return
      }
      await settleFailure(res.error ?? REMIND_COPY.shareEntryRotateFail)
    } catch {
      await settleFailure(REMIND_COPY.shareEntryRotateFail)
    } finally {
      setRotating(false)
    }
  }

  return {
    code,
    displayCode: code ? formatJoinCode(code) : null,
    rotating,
    rotateError,
    rotateOk,
    rotate,
  }
}
