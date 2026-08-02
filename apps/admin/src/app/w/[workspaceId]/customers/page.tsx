'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, EmptyState, Input, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

export default function CustomersPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) return;
    const q = new URLSearchParams();
    if (search.trim()) q.set('search', search.trim());
    if (segment) q.set('segment', segment);
    const qs = q.toString() ? `?${q}` : '';
    setLoading(true);
    api<any[]>(workspacePath(workspaceId, `/customers${qs}`), { token: session.token })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId, search, segment]);

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader eyebrow="CRM" title="Customers" description="Search and segment buyers." />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: '1 1 220px' }}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / email / telegram" />
        </div>
        {['', 'new', 'with_service', 'without_service', 'telegram_only'].map((s) => (
          <Button key={s || 'all'} size="sm" variant={segment === s ? 'primary' : 'secondary'} onClick={() => setSegment(s)}>
            {s || 'All'}
          </Button>
        ))}
      </div>
      {loading ? <Skeleton height={120} radius={16} /> : null}
      {!loading && items.length === 0 ? <EmptyState icon="user" title="No customers" /> : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((c) => (
          <Card key={c.id} padding={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{c.name || c.email || c.telegramUsername || c.id}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--ns-muted)', fontSize: 13 }}>
                  {c.email || '—'} {c.telegramUserId ? `· TG ${c.telegramUserId}` : ''}
                </p>
              </div>
              <Link href={`/w/${workspaceId}/customers/${c.id}`}>
                <Button size="sm" variant="secondary">
                  Open
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
      {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
    </SellerShell>
  );
}
