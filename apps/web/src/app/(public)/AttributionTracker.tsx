'use client';

import { useEffect } from 'react';

export default function AttributionTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const eid = params.get('eid');
      const cid = params.get('cid');
      const utm_source = params.get('utm_source');
      const utm_medium = params.get('utm_medium');
      const utm_campaign = params.get('utm_campaign');

      if (!eid && !cid && !utm_source) return;

      const qs = new URLSearchParams();
      if (eid) qs.set('eid', eid);
      if (cid) qs.set('cid', cid);
      if (utm_source) qs.set('utm_source', utm_source);
      if (utm_medium) qs.set('utm_medium', utm_medium);
      if (utm_campaign) qs.set('utm_campaign', utm_campaign);

      fetch(`/api/track/lp?${qs.toString()}`, { method: 'GET', keepalive: true }).catch(() => {});
    } catch {
      // attribution is best-effort
    }
  }, []);

  return null;
}
