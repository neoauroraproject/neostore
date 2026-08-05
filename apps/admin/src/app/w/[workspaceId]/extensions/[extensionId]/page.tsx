'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, Input, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../../components/SellerShell';
import { api, workspacePath } from '../../../../../lib/api';

export default function ExtensionSettingsPage() {
  const params = useParams<{ workspaceId: string; extensionId: string }>();
  const { workspaceId, extensionId } = params;
  const id = decodeURIComponent(extensionId);
  const session = useSellerSession(workspaceId);
  const [ext, setExt] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) return;
    api<any>(workspacePath(workspaceId, '/extensions'), { token: session.token })
      .then((data) => {
        const found = (data.extensions || []).find((e: any) => e.id === id);
        setExt(found);
        const next: Record<string, string> = {};
        for (const f of found?.contributes?.settings || []) {
          const v = found.settings?.[f.key];
          next[f.key] = v == null || v === '••••••••' ? '' : String(v);
        }
        setForm(next);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId, id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    setError('');
    setOk('');
    try {
      const body: Record<string, unknown> = { ...form };
      for (const f of ext?.contributes?.settings || []) {
        if (f.type === 'boolean') body[f.key] = form[f.key] === 'true' || form[f.key] === '1';
        if (f.type === 'secret' && !form[f.key]) delete body[f.key];
      }
      await api(workspacePath(workspaceId, `/extensions/${encodeURIComponent(id)}/settings`), {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify(body),
      });
      setOk('Saved. Secrets kept if left blank.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Extension"
        title={ext?.name || id}
        actions={
          <Link href={`/w/${workspaceId}/extensions`}>
            <Button size="sm" variant="secondary">
              Back
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={180} radius={16} /> : null}
      {!loading && ext ? (
        <Card padding={24} style={{ maxWidth: 560 }}>
          <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
            {(ext.contributes?.settings || []).map((f: any) => (
              <label key={f.key} style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
                {f.label || f.key}
                {f.type === 'boolean' ? (
                  <select
                    value={form[f.key] || 'false'}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ height: 44, borderRadius: 12, border: '1px solid var(--ns-border)', padding: '0 12px' }}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <Input
                    type={f.type === 'secret' ? 'password' : 'text'}
                    value={form[f.key] || ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.type === 'secret' ? '••••••••' : ''}
                  />
                )}
              </label>
            ))}
            {ok ? <p style={{ color: 'var(--ns-success)', margin: 0 }}>{ok}</p> : null}
            {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
            <Button type="submit">Save settings</Button>
          </form>
        </Card>
      ) : null}
    </SellerShell>
  );
}
