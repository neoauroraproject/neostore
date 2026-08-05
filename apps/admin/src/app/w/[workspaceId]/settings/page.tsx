'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, Input, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 };

export default function SettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [profile, setProfile] = useState({
    title: '',
    description: '',
    enabled: true,
    defaultCurrency: 'USD',
    autoDeliverEnabled: false,
    autoDeliverDelayMinutes: 0,
    telegramWelcomeText: '',
    telegramAdminChatId: '',
    telegramBotEnabled: false,
  });
  const [schedule, setSchedule] = useState({ timezone: 'UTC', hours: 'Mon–Fri 09:00–18:00', note: '' });
  const [botToken, setBotToken] = useState('');
  const [broadcast, setBroadcast] = useState('');
  const [deepLink, setDeepLink] = useState('');

  useEffect(() => {
    if (!session?.token) return;
    api<any>(workspacePath(workspaceId, '/profile'), { token: session.token })
      .then((p) => {
        setProfile({
          title: p.title || '',
          description: p.description || '',
          enabled: p.enabled !== false,
          defaultCurrency: p.defaultCurrency || 'USD',
          autoDeliverEnabled: Boolean(p.autoDeliverEnabled),
          autoDeliverDelayMinutes: Number(p.autoDeliverDelayMinutes || 0),
          telegramWelcomeText: p.telegramWelcomeText || '',
          telegramAdminChatId: p.telegramAdminChatId || '',
          telegramBotEnabled: Boolean(p.telegramBotEnabled),
        });
        const ds = (p.deliverySchedule || {}) as any;
        setSchedule({
          timezone: ds.timezone || 'UTC',
          hours: ds.hours || 'Mon–Fri 09:00–18:00',
          note: ds.note || '',
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await api(workspacePath(workspaceId, '/profile'), {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({
          ...profile,
          deliverySchedule: schedule,
        }),
      });
      setOk('Store profile saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveTelegram(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    setTgSaving(true);
    setError('');
    setOk('');
    try {
      const body: Record<string, unknown> = {
        enabled: profile.telegramBotEnabled,
        welcomeText: profile.telegramWelcomeText,
        adminChatId: profile.telegramAdminChatId || undefined,
      };
      if (botToken.trim()) body.botToken = botToken.trim();
      await api(workspacePath(workspaceId, '/telegram'), {
        method: 'POST',
        token: session.token,
        body: JSON.stringify(body),
      });
      setBotToken('');
      setOk('Telegram settings saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTgSaving(false);
    }
  }

  async function createSellerLink() {
    if (!session?.token) return;
    setError('');
    setOk('');
    try {
      const res = await api<any>(workspacePath(workspaceId, '/telegram/links'), {
        method: 'POST',
        token: session.token,
        body: '{}',
      });
      setDeepLink(res.deepLink || '');
      setOk('Open the deep link in Telegram to bind this seller chat.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function sendBroadcast() {
    if (!session?.token || !broadcast.trim()) return;
    setError('');
    setOk('');
    try {
      const res = await api<any>(workspacePath(workspaceId, '/telegram/broadcast'), {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ text: broadcast, audience: 'all' }),
      });
      setOk(res?.note || 'Broadcast intent recorded.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Store profile, delivery hours, and Telegram seller notify."
        actions={
          <Link href={`/w/${workspaceId}/homepage`}>
            <Button size="sm" variant="secondary">
              Homepage designer
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={220} radius={16} /> : null}
      {!loading ? (
        <div style={{ display: 'grid', gap: 16, maxWidth: 680 }}>
          <Card padding={24}>
            <form onSubmit={saveProfile} style={{ display: 'grid', gap: 12 }}>
              <strong>Store profile</strong>
              <label style={label}>
                Title
                <Input value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
              </label>
              <label style={label}>
                Description
                <Input
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                />
              </label>
              <label style={label}>
                Default currency
                <select
                  value={profile.defaultCurrency}
                  onChange={(e) => setProfile({ ...profile, defaultCurrency: e.target.value })}
                  style={{ height: 44, borderRadius: 12, border: '1px solid var(--ns-border)', padding: '0 12px' }}
                >
                  <option value="USD">USD</option>
                  <option value="IRT">IRT</option>
                </select>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={profile.enabled}
                  onChange={(e) => setProfile({ ...profile, enabled: e.target.checked })}
                />
                Store enabled
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={profile.autoDeliverEnabled}
                  onChange={(e) => setProfile({ ...profile, autoDeliverEnabled: e.target.checked })}
                />
                Auto-deliver after manual receipt
              </label>
              <label style={label}>
                Auto-deliver delay (minutes)
                <Input
                  value={String(profile.autoDeliverDelayMinutes)}
                  onChange={(e) =>
                    setProfile({ ...profile, autoDeliverDelayMinutes: Number(e.target.value || 0) })
                  }
                />
              </label>
              <strong>Delivery schedule</strong>
              <label style={label}>
                Timezone
                <Input value={schedule.timezone} onChange={(e) => setSchedule({ ...schedule, timezone: e.target.value })} />
              </label>
              <label style={label}>
                Hours
                <Input value={schedule.hours} onChange={(e) => setSchedule({ ...schedule, hours: e.target.value })} />
              </label>
              <label style={label}>
                Note
                <Input value={schedule.note} onChange={(e) => setSchedule({ ...schedule, note: e.target.value })} />
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </form>
          </Card>

          <Card padding={24}>
            <form onSubmit={saveTelegram} style={{ display: 'grid', gap: 12 }}>
              <strong>Telegram</strong>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={profile.telegramBotEnabled}
                  onChange={(e) => setProfile({ ...profile, telegramBotEnabled: e.target.checked })}
                />
                Bot enabled
              </label>
              <label style={label}>
                Bot token (leave blank to keep current)
                <Input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="off"
                />
              </label>
              <label style={label}>
                Welcome text
                <Input
                  value={profile.telegramWelcomeText}
                  onChange={(e) => setProfile({ ...profile, telegramWelcomeText: e.target.value })}
                />
              </label>
              <label style={label}>
                Admin chat id
                <Input
                  value={profile.telegramAdminChatId}
                  onChange={(e) => setProfile({ ...profile, telegramAdminChatId: e.target.value })}
                />
              </label>
              <Button type="submit" disabled={tgSaving}>
                {tgSaving ? 'Saving…' : 'Save Telegram'}
              </Button>
            </form>
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <strong>Seller deep-link</strong>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ns-muted)' }}>
                Bind this seller so new orders notify only linked chats (plus admin chat).
              </p>
              <Button variant="secondary" onClick={createSellerLink}>
                Generate link
              </Button>
              {deepLink ? (
                <a href={deepLink} style={{ color: 'var(--ns-accent)', fontWeight: 600, wordBreak: 'break-all' }}>
                  {deepLink}
                </a>
              ) : null}
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <strong>Broadcast (intent)</strong>
              <Input value={broadcast} onChange={(e) => setBroadcast(e.target.value)} placeholder="Message to audience=all" />
              <Button variant="secondary" onClick={sendBroadcast}>
                Record broadcast
              </Button>
            </div>
          </Card>
          {ok ? <p style={{ color: 'var(--ns-success)' }}>{ok}</p> : null}
          {error ? <p style={{ color: 'var(--ns-danger)' }}>{error}</p> : null}
        </div>
      ) : null}
    </SellerShell>
  );
}
