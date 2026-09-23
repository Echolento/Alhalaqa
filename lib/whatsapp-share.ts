// lib/whatsapp-share.ts
// #32 slice 2/8 — pure wa.me link builders (free, no paid WhatsApp API).
// All user-facing text comes from lib/remind-copy.ts (single source of truth).

import { REMIND_COPY } from '@/lib/remind-copy'

/** Strip everything but digits for wa.me (expects country code, no "+"). */
export function toWaMeDigits(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/** True when the number can open a wa.me chat (needs at least a country code + number). */
export function canWhatsApp(phone: string | null | undefined): boolean {
  return toWaMeDigits(phone).length >= 10
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = toWaMeDigits(phone)
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function buildRemindWhatsAppText(params: {
  studentName: string
  amount?: number
  currency?: string
  periodLabel?: string
}): string {
  return REMIND_COPY.whatsappRemindText(params)
}

export function buildRemindWhatsAppUrl(params: {
  phone: string
  studentName: string
  amount?: number
  currency?: string
  periodLabel?: string
}): string {
  return buildWhatsAppUrl(params.phone, buildRemindWhatsAppText(params))
}

export function buildInviteWhatsAppText(params: {
  studentName: string
  inviteUrl: string
}): string {
  return REMIND_COPY.whatsappInviteText(params)
}

export function buildInviteWhatsAppUrl(params: {
  phone: string
  studentName: string
  inviteUrl: string
}): string {
  return buildWhatsAppUrl(params.phone, buildInviteWhatsAppText(params))
}
