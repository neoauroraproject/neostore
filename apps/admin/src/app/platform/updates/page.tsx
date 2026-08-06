'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Input, PageHeader, Skeleton } from '@neostore/ui';
import { api } from '../../../lib/api';
import { loadSession } from '../../../lib/session';

type CheckResult = {
  currentVersion?: string;
  currentTag?: string;
  updateAvailable?: boolean;
  latest?: { tag?: string; name?: string; url?: string; publishedAt?: string; notes?: string };
  releases?: Array<{ tag?: string; name?: string; url?: string; publishedAt?: string }>;
  host?: { state?: string; message?: string; version?: string; at?: string };
  cliHint?: string;
  note?: string;
};

export default function PlatformUpdatesPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [data, setData] = useState<CheckResult | null>(null);
  const [target, setTarget] = useState('');

  async function refreshStatus(t: string) {
    const s = await api<CheckResult>('/admin/platform/updates', { token: t });
    setData((d) => ({ ...(d || {}), ...s, host: s.host || d?.host }));
  }

  useEffect(() => {
    const s = loadSession();
    if (!s?.token) return;
    setToken(s.token);
    refreshStatus(s.token)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const id = setInterval(() => {
      refreshStatus(s.token).catch(() => null);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  async function check() {
    if (!token) return;
    setChecking(true);
    setError('');
    setOk('');
    try {
      const d = await api<CheckResult>('/admin/platform/updates/check', {
        method: 'POST',
        token,
        body: '{}',
      });
      setData(d);
      setTarget(d.latest?.tag || 'latest');
      setOk(d.updateAvailable ? `Update available: ${d.latest?.tag}` : 'You are on the latest release channel.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  }

  async function apply(version?: string) {
    if (!token) return;
    const v = (version || target || data?.latest?.tag || 'latest').trim();
    if (!confirm(`Pull and deploy ${v}? API will remigrate the database on boot.`)) return;
    setApplying(true);
    setError('');
    setOk('');
    try {
      const res = await api<any>('/admin/platform/updates/apply', {
        method: 'POST',
        token,
        body: JSON.stringify({ version: v }),
      });
      setOk(res.note || `Queued ${v}`);
      await refreshStatus(token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  }

  const host = data?.host;

  return (
    <main className="ns-container" style={{ paddingTop: 40, paddingBottom: 48, maxWidth: 800 }}>
      <PageHeader
        eyebrow="Super Admin"
        title="System updates"
        description="Check GitHub releases and deploy GHCR images. Database schema is applied automatically by the API entrypoint."
        actions={
          <Link href="/platform">
            <Button size="sm" variant="secondary">
              Back
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={180} radius={16} /> : null}
      {!loading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card padding={24} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong>Running</strong>
              <Badge tone="accent">{data?.currentTag || data?.currentVersion || '—'}</Badge>
              {data?.updateAvailable ? <Badge>Update available</Badge> : <Badge tone="neutral">Channel OK</Badge>}
            </div>
            <p style={{ margin: 0, color: 'var(--ns-muted)', fontSize: 14 }}>
              Host updater: <strong>{host?.state || 'unknown'}</strong>
              {host?.message ? ` — ${host.message}` : ''}
              {host?.at ? ` (${host.at})` : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={check} disabled={checking}>
                {checking ? 'Checking GitHub…' : 'Check for updates'}
              </Button>
              <Button
                variant="secondary"
                disabled={applying || !data?.latest?.tag}
                onClick={() => apply(data?.latest?.tag)}
              >
                {applying ? 'Queuing…' : `Update to ${data?.latest?.tag || 'latest'}`}
              </Button>
            </div>
          </Card>

          <Card padding={24} style={{ display: 'grid', gap: 12 }}>
            <strong>Deploy specific version</strong>
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="v0.4.0 or latest"
            />
            <Button variant="secondary" disabled={applying || !target.trim()} onClick={() => apply(target)}>
              Queue deploy
            </Button>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ns-muted)' }}>
              CLI equivalent: <code>{data?.cliHint || 'sudo bash /opt/neostore/install/neostore.sh update'}</code>
            </p>
          </Card>

          {data?.latest?.notes ? (
            <Card padding={24}>
              <strong>{data.latest.name || data.latest.tag}</strong>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                  color: 'var(--ns-muted)',
                  marginTop: 12,
                  maxHeight: 280,
                  overflow: 'auto',
                }}
              >
                {data.latest.notes}
              </pre>
              {data.latest.url ? (
                <a href={data.latest.url} target="_blank" rel="noreferrer" style={{ color: 'var(--ns-accent)' }}>
                  Open GitHub release
                </a>
              ) : null}
            </Card>
          ) : null}

          {data?.releases?.length ? (
            <Card padding={20}>
              <strong>Recent releases</strong>
              {data.releases.map((r) => (
                <div
                  key={r.tag}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 0',
                    borderTop: '1px solid var(--ns-border)',
                    marginTop: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.tag}</div>
                    <div style={{ fontSize: 12, color: 'var(--ns-muted)' }}>{r.publishedAt || ''}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => apply(r.tag)}>
                    Deploy
                  </Button>
                </div>
              ))}
            </Card>
          ) : null}

          {ok ? <p style={{ color: 'var(--ns-success)', margin: 0 }}>{ok}</p> : null}
          {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
        </div>
      ) : null}
    </main>
  );
}
