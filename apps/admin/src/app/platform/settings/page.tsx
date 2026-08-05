'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, PageHeader, Skeleton } from '@neostore/ui';
import { api } from '../../../lib/api';
import { loadSession } from '../../../lib/session';

export default function PlatformSettingsPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');
  const [smtp, setSmtp] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    password: '',
    fromName: 'NeoStore',
    fromEmail: '',
  });
  const [google, setGoogle] = useState({
    clientId: '',
    clientSecret: '',
    enabledForCustomers: false,
    enabledForSellers: false,
  });
  const [cryptoJson, setCryptoJson] = useState('[]');
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    const s = loadSession();
    if (!s?.token) return;
    setToken(s.token);
    api<any>('/admin/platform/settings', { token: s.token })
      .then((d) => {
        setSmtp({
          host: d.smtp?.host || '',
          port: String(d.smtp?.port || 587),
          secure: Boolean(d.smtp?.secure),
          user: d.smtp?.user || '',
          password: '',
          fromName: d.smtp?.fromName || 'NeoStore',
          fromEmail: d.smtp?.fromEmail || '',
        });
        setGoogle({
          clientId: d.googleOAuth?.clientId || '',
          clientSecret: '',
          enabledForCustomers: Boolean(d.googleOAuth?.enabledForCustomers),
          enabledForSellers: Boolean(d.googleOAuth?.enabledForSellers),
        });
        setCryptoJson(JSON.stringify(d.cryptoAssets || [], null, 2));
        setTestTo(d.smtp?.fromEmail || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      let cryptoAssets = [];
      try {
        cryptoAssets = JSON.parse(cryptoJson);
        if (!Array.isArray(cryptoAssets)) throw new Error('cryptoAssets must be an array');
      } catch (err: any) {
        throw new Error(err.message || 'Invalid crypto assets JSON');
      }
      await api('/admin/platform/settings', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          smtp: {
            ...smtp,
            port: Number(smtp.port || 587),
            password: smtp.password || undefined,
          },
          googleOAuth: {
            ...google,
            clientSecret: google.clientSecret || undefined,
          },
          cryptoAssets,
        }),
      });
      setOk('Settings saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function testSmtp() {
    if (!token || !testTo) return;
    setError('');
    setOk('');
    try {
      await api('/admin/platform/smtp/test', {
        method: 'POST',
        token,
        body: JSON.stringify({ to: testTo }),
      });
      setOk('Test email sent.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main className="ns-container" style={{ paddingTop: 40, paddingBottom: 48, maxWidth: 720 }}>
      <PageHeader
        eyebrow="Super Admin"
        title="Platform settings"
        description="SMTP, Google OAuth, and crypto rails defaults."
        actions={
          <Link href="/platform">
            <Button size="sm" variant="secondary">
              Back
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={200} radius={16} /> : null}
      {!loading ? (
        <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
          <Card padding={24} style={{ display: 'grid', gap: 12 }}>
            <strong>SMTP</strong>
            <Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="Host" />
            <Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} placeholder="Port" />
            <Input value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} placeholder="User" />
            <Input
              type="password"
              value={smtp.password}
              onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
              placeholder="Password (leave blank to keep)"
            />
            <Input
              value={smtp.fromEmail}
              onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })}
              placeholder="From email"
            />
            <Input
              value={smtp.fromName}
              onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })}
              placeholder="From name"
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={smtp.secure}
                onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
              />
              Secure (TLS)
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Test recipient" />
              <Button type="button" variant="secondary" onClick={testSmtp}>
                Send test
              </Button>
            </div>
          </Card>
          <Card padding={24} style={{ display: 'grid', gap: 12 }}>
            <strong>Google OAuth</strong>
            <Input
              value={google.clientId}
              onChange={(e) => setGoogle({ ...google, clientId: e.target.value })}
              placeholder="Client ID"
            />
            <Input
              type="password"
              value={google.clientSecret}
              onChange={(e) => setGoogle({ ...google, clientSecret: e.target.value })}
              placeholder="Client secret (leave blank to keep)"
            />
            <label style={{ display: 'flex', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={google.enabledForCustomers}
                onChange={(e) => setGoogle({ ...google, enabledForCustomers: e.target.checked })}
              />
              Enable for customers
            </label>
            <label style={{ display: 'flex', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={google.enabledForSellers}
                onChange={(e) => setGoogle({ ...google, enabledForSellers: e.target.checked })}
              />
              Enable for sellers
            </label>
          </Card>
          <Card padding={24} style={{ display: 'grid', gap: 12 }}>
            <strong>Crypto assets (FX)</strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ns-muted)' }}>
              Array of {'{ id, symbol, network, label, enabled, rateToUsd }'} used for product crypto estimates.
            </p>
            <textarea
              value={cryptoJson}
              onChange={(e) => setCryptoJson(e.target.value)}
              rows={12}
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
                borderRadius: 12,
                border: '1px solid var(--ns-border)',
                padding: 12,
              }}
            />
          </Card>
          {ok ? <p style={{ color: 'var(--ns-success)', margin: 0 }}>{ok}</p> : null}
          {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </form>
      ) : null}
    </main>
  );
}
