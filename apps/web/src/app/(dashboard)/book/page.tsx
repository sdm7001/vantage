'use client';

const CAL_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://cal.com/scott-mcauley-qe0mup/15min';

export default function BookPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '0' }}>
      <div style={{ padding: '20px 28px 12px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Book a Consultation</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
          Schedule a 15-minute strategy call with Scott.
        </p>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <iframe
          src={CAL_URL}
          title="Book a Consultation"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          allow="payment"
        />
      </div>
    </div>
  );
}
