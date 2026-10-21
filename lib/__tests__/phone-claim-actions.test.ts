// lib/__tests__/phone-claim-actions.test.ts
// Regression guard: the phone-only claim path was removed because a
// self-asserted phone number could be used to take over a family's account.
// Claiming now requires the teacher's code (see claim-by-join-code.test.ts).

import { describe, it, expect } from 'vitest'
import * as actions from '@/lib/claim-actions'

describe('removed phone-only claim surface', () => {
  it('no longer exports phone-based roster lookup', () => {
    expect('lookupStudentsByPhone' in actions).toBe(false)
  })

  it('no longer exports phone-only claiming', () => {
    expect('claimByPhone' in actions).toBe(false)
  })

  it('still exports the code-based claim', () => {
    expect(typeof actions.claimWithTeacherCode).toBe('function')
  })
})
