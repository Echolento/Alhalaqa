'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  Settings,
  Users,
  Wallet,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  profile: Profile
}

const teacherLinks = [
  { href: '/dashboard/payments', label: 'المدفوعات', icon: Wallet },
  { href: '/dashboard/students', label: 'الطلاب', icon: Users },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
]

export function DashboardHeader({ profile }: HeaderProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const links = teacherLinks

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
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/10 border border-border rounded-xl flex items-center justify-center p-2">
                  <Image
                    src="/Logo.png"
                    alt="Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-1">
              {links.map((link) => {
                const isActive = pathname.startsWith(link.href)

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

            <div className="px-4 pb-4">
              <a
                href="https://wa.me/201067372520"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-green-600 hover:bg-green-50/10 transition-colors w-full"
              >
                <MessageCircle className="w-5 h-5" />
                <span>تواصل معي عبر واتساب</span>
              </a>
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="bg-primary/10 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-sm">
            <Image
              src="/Logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        </Link>
      </div>

      <div className="hidden md:block" />

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
            <p className="text-xs text-muted-foreground">معلم</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              <span>الإعدادات</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a
              href="https://wa.me/201067372520"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 cursor-pointer text-green-600"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تواصل عبر واتساب</span>
            </a>
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
