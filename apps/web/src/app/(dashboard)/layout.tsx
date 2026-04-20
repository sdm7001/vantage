'use client';

import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/analytics', label: 'Dashboard', icon: '📊' },
  { href: '/prospects', label: 'Prospects', icon: '👥' },
  { href: '/reports', label: 'Reports', icon: '📄' },
  { href: '/outreach', label: 'Outreach', icon: '✉️' },
  { href: '/campaigns', label: 'Campaigns', icon: '📣' },
  { href: '/sourcing', label: 'Sourcing', icon: '🎯' },
  { href: '/jobs', label: 'Jobs', icon: '⚙️' },
  { href: '/settings', label: 'Settings', icon: '⚡' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: '224px', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid #1e293b' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tmg-logo.svg"
            alt="TMG"
            style={{ height: '34px', width: 'auto', display: 'block', marginBottom: '6px' }}
          />
          <div style={{ fontSize: '9px', color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Vantage · Audit-First Outreach
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(link => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  color: active ? '#f8fafc' : '#94a3b8',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  marginBottom: '2px',
                  background: active ? '#1e293b' : 'transparent',
                  borderLeft: active ? '3px solid #1565C0' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: '14px' }}>{link.icon}</span>
                {link.label}
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
