import { describe, it, expect } from 'vitest'
import { extractInstapayHandle, extractInstapayLink, getInstaPayContract, validateInstapayHandle, validateInstapayLink } from '@/lib/instapay'

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

  it('strips an injection tail and keeps the bare link', () => {
    const result = validateInstapayLink('https://ipn.eg/S/abc"><script>alert(1)</script>')
    expect(result).toEqual({ ok: true, normalized: 'https://ipn.eg/S/abc' })
  })

  it('extracts the link from share-copy with surrounding words', () => {
    const result = validateInstapayLink(
      'ادفع لـ أحمد عبر انستاباي https://ipn.eg/S/ahmed.ali/instapay/123 شكراً',
    )
    expect(result).toEqual({
      ok: true,
      normalized: 'https://ipn.eg/S/ahmed.ali/instapay/123',
    })
  })

  it('drops trailing chat punctuation after the link', () => {
    const result = validateInstapayLink('https://ipn.eg/S/abc123.')
    expect(result).toEqual({ ok: true, normalized: 'https://ipn.eg/S/abc123' })
  })

  it('still rejects a lookalike host buried in share-copy', () => {
    const result = validateInstapayLink('ادفع هنا https://ipn-eg.com/S/abc')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.length).toBeGreaterThan(5)
  })
})

describe('extractInstapayLink', () => {
  it('returns a bare link unchanged', () => {
    expect(extractInstapayLink('https://ipn.eg/S/abc123')).toBe('https://ipn.eg/S/abc123')
  })

  it('cuts everything before and after the link', () => {
    expect(
      extractInstapayLink('pay 200 on instapay https://ipn.eg/S/ahmed/instapay/1 bla bla'),
    ).toBe('https://ipn.eg/S/ahmed/instapay/1')
  })

  it('adds the scheme when the paste starts at the host', () => {
    expect(extractInstapayLink('ipn.eg/S/abc123')).toBe('https://ipn.eg/S/abc123')
  })

  it('returns null when no InstaPay marker is present', () => {
    expect(extractInstapayLink('just some words')).toBeNull()
    expect(extractInstapayLink('')).toBeNull()
    expect(extractInstapayLink(null)).toBeNull()
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

describe('extractInstapayHandle', () => {
  it('derives the handle from a share link path', () => {
    expect(extractInstapayHandle('https://ipn.eg/S/ahmed.ali/instapay/123456')).toBe(
      'ahmed.ali@instapay',
    )
  })

  it('accepts a link whose segment already carries the @instapay suffix', () => {
    expect(extractInstapayHandle('https://ipn.eg/S/ahmed.ali%40instapay/instapay/1')).toBe(
      'ahmed.ali@instapay',
    )
  })

  it('returns null when the path has no handle segment', () => {
    expect(extractInstapayHandle('https://ipn.eg/S/')).toBeNull()
  })

  it('returns null for a non-ipn.eg link', () => {
    expect(extractInstapayHandle('https://ipn-eg.com/S/ahmed.ali/instapay/1')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(extractInstapayHandle('not a url')).toBeNull()
    expect(extractInstapayHandle('')).toBeNull()
  })

  it('derives the handle from share-copy with surrounding words', () => {
    expect(
      extractInstapayHandle('ادفع لـ أحمد https://ipn.eg/S/ahmed.ali/instapay/123 شكراً'),
    ).toBe('ahmed.ali@instapay')
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
