import { describe, it, expect } from 'vitest'
import { getInstaPayContract, validateInstapayHandle, validateInstapayLink } from '@/lib/instapay'

describe('validateInstapayLink', () => {
  it('accepts a valid ipn.eg share link', () => {
    const result = validateInstapayLink('https://ipn.eg/S/abc123XYZ')
    expect(result.ok).toBe(true)
  })

  it('rejects a lookalike host with an Arabic explanation', () => {
    const result = validateInstapayLink('https://ipn-eg.com/S/abc123')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/ipn\.eg/)
  })

  it('rejects a wrong scheme with an Arabic explanation', () => {
    const result = validateInstapayLink('http://ipn.eg/S/abc123')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/https/)
  })

  it('rejects an injection string with an Arabic explanation', () => {
    const result = validateInstapayLink('https://ipn.eg/S/abc"><script>alert(1)</script>')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.length).toBeGreaterThan(5)
  })
})

describe('validateInstapayHandle', () => {
  it('accepts a valid name@instapay handle', () => {
    const result = validateInstapayHandle('ahmed.ali@instapay')
    expect(result.ok).toBe(true)
  })

  it('rejects a handle with the wrong suffix', () => {
    const result = validateInstapayHandle('ahmed@gmail.com')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/name@instapay/)
  })

  it('rejects a handle injection string', () => {
    const result = validateInstapayHandle('ahmed<script>@instapay')
    expect(result.ok).toBe(false)
  })
})

describe('getInstaPayContract', () => {
  it('exposes instapayLink and instapayHandle for push payload and pay screen', () => {
    const contract = getInstaPayContract({
      instapay_link: 'https://ipn.eg/S/abc123',
      instapay_handle: 'ahmed@instapay',
    })
    expect(contract.instapayLink).toBe('https://ipn.eg/S/abc123')
    expect(contract.instapayHandle).toBe('ahmed@instapay')
  })
})
