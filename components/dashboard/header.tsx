'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth-actions'
import type { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Menu,
  LogOut,
  User,
  Settings,
  BookOpen,
  Calendar,
  Users,
  BarChart3,
  Building,
  GraduationCap,
  LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  profile: Profile
}

const teacherLinks = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
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
  { href: '/dashboard/analytics', label: 'الإحصائيات', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
]

export function DashboardHeader({ profile }: HeaderProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

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
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="font-bold text-lg">إتقان</span>
                  <p className="text-xs text-muted-foreground">{roleLabels[profile.role]}</p>
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-1">
              {links.map((link) => {
                const isActive = pathname === link.href ||
                  (link.href !== '/dashboard' && pathname.startsWith(link.href))

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg">إتقان</span>
        </Link>
      </div>

      {/* Page title - hidden on mobile */}
      <div className="hidden md:block" />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {profile.full_name?.charAt(0) || '؟'}
              </span>
            </div>
            <span className="hidden sm:inline-block">{profile.full_name || 'مستخدم'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{profile.full_name || 'مستخدم'}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[profile.role]}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
              <User className="w-4 h-4" />
              <span>الملف الشخصي</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              <span>الإعدادات</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut()}
            className="flex items-center gap-2 text-destructive cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
