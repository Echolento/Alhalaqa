'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import {
  BookOpen,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Building,
  GraduationCap,
  LayoutDashboard,
  UserCog,
  Wallet,
  MessageCircle,
} from 'lucide-react'

interface SidebarProps {
  profile: Profile
}

const teacherLinks = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dashboard/payments', label: 'المدفوعات', icon: Wallet },
  { href: '/dashboard/calendar', label: 'التقويم', icon: Calendar },
  { href: '/dashboard/students', label: 'الطلاب', icon: Users },
  { href: '/dashboard/sessions', label: 'الحصص', icon: BookOpen },
  { href: '/dashboard/analytics', label: 'الإحصائيات', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
]

const studentLinks = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dashboard/sessions', label: 'حصصي', icon: BookOpen },
  { href: '/dashboard/progress', label: 'تقدمي', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
]

const adminLinks = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dashboard/organizations', label: 'المؤسسات', icon: Building },
  { href: '/dashboard/teachers', label: 'المعلمون', icon: GraduationCap },
  { href: '/dashboard/students', label: 'الطلاب', icon: Users },
  { href: '/dashboard/manage', label: 'إدارة التعيينات', icon: UserCog },
  { href: '/dashboard/analytics', label: 'الإحصائيات', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
]

export function DashboardSidebar({ profile }: SidebarProps) {
  const pathname = usePathname()

  const links = profile.role === 'admin'
    ? adminLinks
    : profile.role === 'teacher'
      ? teacherLinks
      : studentLinks

  const roleLabels = {
    admin: 'مشرف',
    teacher: 'معلم',
    student: 'طالب',
  }

  return (
    <aside className="fixed right-0 top-0 h-screen w-64 bg-sidebar border-l border-sidebar-border hidden md:flex flex-col z-40 overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="bg-sidebar-primary/10 backdrop-blur-sm border border-sidebar-border/50 rounded-xl p-1 shadow-sm">
            <Image
              src="/Logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div>
            <p className="text-xs text-sidebar-foreground/60">{roleLabels[profile.role]}</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href ||
            (link.href !== '/dashboard' && pathname.startsWith(link.href))

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <link.icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-10 h-10 bg-sidebar-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-accent-foreground">
              {profile.full_name?.charAt(0) || '؟'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || 'مستخدم'}
            </p>
            <p className="text-xs text-sidebar-foreground/60">{roleLabels[profile.role]}</p>
          </div>
        </div>

        {/* WhatsApp contact — teachers only */}
        {profile.role === 'teacher' && (
          <a
            href="https://wa.me/201067372520"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50/10 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل معي عبر واتساب</span>
          </a>
        )}
      </div>
    </aside>
  )
}
