import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: '220px', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>Vantage</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>by TexMG</div>
        </div>

        <nav style={{ flex: 1, padding: '16px 8px' }}>
          {[
            { href: '/prospects', label: 'Prospects' },
            { href: '/campaigns', label: 'Campaigns' },
            { href: '/analytics', label: 'Analytics' },
            { href: '/settings', label: 'Settings' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{ display: 'block', padding: '8px 12px', color: '#94a3b8', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', marginBottom: '2px' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b' }}>
          <OrganizationSwitcher appearance={{ variables: { colorBackground: '#1e293b', colorText: 'white' } }} />
          <div style={{ marginTop: '12px' }}>
            <UserButton />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
