'use client';

import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  Megaphone,
  Target,
  Cpu,
  Settings,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';

const NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/analytics',  label: 'Dashboard',  Icon: LayoutDashboard },
  { href: '/prospects',  label: 'Prospects',  Icon: Users },
  { href: '/reports',    label: 'Reports',    Icon: FileText },
  { href: '/outreach',   label: 'Outreach',   Icon: Mail },
  { href: '/campaigns',  label: 'Campaigns',  Icon: Megaphone },
  { href: '/sourcing',   label: 'Sourcing',   Icon: Target },
  { href: '/jobs',       label: 'Jobs',       Icon: Cpu },
  { href: '/book',       label: 'Book a Call', Icon: CalendarDays },
  { href: '/settings',   label: 'Settings',   Icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', margin: 0, padding: 0 }}>
      {/* Sidebar */}
      <aside style={{ width: '224px', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid #1e293b' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tmg-logo.png"
            alt="TMG"
            style={{ height: '34px', width: 'auto', display: 'block', marginBottom: '6px', filter: 'brightness(0) invert(1)' }}
          />
          <div style={{ fontSize: '9px', color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Vantage · Audit-First Outreach
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  color: active ? '#f8fafc' : '#64748b',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  marginBottom: '2px',
                  background: active ? '#1e293b' : 'transparent',
                  borderLeft: active ? '3px solid #1565C0' : '3px solid transparent',
                }}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 16px 20px', borderTop: '1px solid #1e293b' }}>
          <div style={{ marginBottom: '10px' }}>
            <OrganizationSwitcher
              appearance={{ variables: { colorBackground: '#1e293b', colorText: 'white', colorTextSecondary: '#64748b' } }}
            />
          </div>
          <UserButton />
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
