'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, Input, PageHeader, Skeleton } from '@neostore/ui';
import { SellerShell, useSellerSession } from '../../../../components/SellerShell';
import { api, workspacePath } from '../../../../lib/api';

const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 };
const selectStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: '1px solid var(--ns-border)',
  padding: '0 12px',
  background: 'var(--ns-surface-elevated)',
};

type HomepageConfig = {
  hero: { headline: string; subhead: string; ctaLabel: string; ctaHref: string };
  trustBullets: string[];
  showCategoryRow: boolean;
  featuredMode: 'featured' | 'all' | 'manualIds';
  featuredProductIds: string[];
  showSearch: boolean;
  topMenu: Array<{ id: string; label: string; href: string; visible: boolean }>;
};

const defaults: HomepageConfig = {
  hero: {
    headline: '',
    subhead: '',
    ctaLabel: 'Browse catalog',
    ctaHref: '/search',
  },
  trustBullets: ['Instant delivery', 'Secure checkout', 'Support when you need it'],
  showCategoryRow: true,
  featuredMode: 'featured',
  featuredProductIds: [],
  showSearch: true,
  topMenu: [
    { id: 'home', label: 'Home', href: '/', visible: true },
    { id: 'browse', label: 'Browse', href: '/c/all', visible: true },
  ],
};

export default function HomepageDesignerPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const session = useSellerSession(workspaceId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [config, setConfig] = useState<HomepageConfig>(defaults);
  const [sla, setSla] = useState(60);
  const [trustText, setTrustText] = useState(defaults.trustBullets.join('\n'));

  useEffect(() => {
    if (!session?.token) return;
    Promise.all([
      api<any>(workspacePath(workspaceId, '/profile'), { token: session.token }),
      api<any[]>(workspacePath(workspaceId, '/products'), { token: session.token }),
    ])
      .then(([profile, prods]) => {
        const hc = { ...defaults, ...(profile.homepageConfig || {}) };
        hc.hero = { ...defaults.hero, ...(hc.hero || {}) };
        setConfig(hc);
        setTrustText((hc.trustBullets || []).join('\n'));
        setSla(Number(profile.manualDeliverSlaMinutes || 60));
        setProducts(prods || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.token, workspaceId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      const homepageConfig: HomepageConfig = {
        ...config,
        trustBullets: trustText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await api(workspacePath(workspaceId, '/profile'), {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ homepageConfig, manualDeliverSlaMinutes: sla }),
      });
      setOk('Homepage saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleProduct(id: string) {
    setConfig((c) => {
      const set = new Set(c.featuredProductIds || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...c, featuredProductIds: [...set] };
    });
  }

  return (
    <SellerShell workspaceId={workspaceId}>
      <PageHeader
        eyebrow="Storefront"
        title="Homepage designer"
        description="Hero, trust strip, categories, and featured grid — stored on this workspace StoreProfile."
        actions={
          <Link href={`/w/${workspaceId}/settings`}>
            <Button size="sm" variant="secondary">
              Settings
            </Button>
          </Link>
        }
      />
      {loading ? <Skeleton height={280} radius={16} /> : null}
      {!loading ? (
        <Card padding={24} style={{ maxWidth: 720 }}>
          <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
            <strong>Hero</strong>
            <label style={label}>
              Headline
              <Input
                value={config.hero.headline}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, headline: e.target.value } })}
                placeholder="Leave empty to use store title"
              />
            </label>
            <label style={label}>
              Subhead
              <Input
                value={config.hero.subhead}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subhead: e.target.value } })}
                placeholder="Leave empty to use store description"
              />
            </label>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <label style={label}>
                CTA label
                <Input
                  value={config.hero.ctaLabel}
                  onChange={(e) => setConfig({ ...config, hero: { ...config.hero, ctaLabel: e.target.value } })}
                />
              </label>
              <label style={label}>
                CTA href
                <Input
                  value={config.hero.ctaHref}
                  onChange={(e) => setConfig({ ...config, hero: { ...config.hero, ctaHref: e.target.value } })}
                />
              </label>
            </div>

            <label style={label}>
              Trust bullets (one per line)
              <textarea
                value={trustText}
                onChange={(e) => setTrustText(e.target.value)}
                rows={4}
                style={{ borderRadius: 12, border: '1px solid var(--ns-border)', padding: 12, fontSize: 14 }}
              />
            </label>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={config.showSearch}
                onChange={(e) => setConfig({ ...config, showSearch: e.target.checked })}
              />
              Show search bar on home
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={config.showCategoryRow}
                onChange={(e) => setConfig({ ...config, showCategoryRow: e.target.checked })}
              />
              Show category chip row
            </label>

            <strong>Top menu</strong>
            {(config.topMenu || []).map((item, idx) => (
              <div key={item.id || idx} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' }}>
                <label style={label}>
                  Label
                  <Input
                    value={item.label}
                    onChange={(e) => {
                      const topMenu = [...(config.topMenu || [])];
                      topMenu[idx] = { ...topMenu[idx], label: e.target.value };
                      setConfig({ ...config, topMenu });
                    }}
                  />
                </label>
                <label style={label}>
                  Href
                  <Input
                    value={item.href}
                    onChange={(e) => {
                      const topMenu = [...(config.topMenu || [])];
                      topMenu[idx] = { ...topMenu[idx], href: e.target.value };
                      setConfig({ ...config, topMenu });
                    }}
                  />
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, paddingBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={item.visible !== false}
                    onChange={(e) => {
                      const topMenu = [...(config.topMenu || [])];
                      topMenu[idx] = { ...topMenu[idx], visible: e.target.checked };
                      setConfig({ ...config, topMenu });
                    }}
                  />
                  Show
                </label>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setConfig({
                  ...config,
                  topMenu: [
                    ...(config.topMenu || []),
                    { id: `m-${Date.now()}`, label: 'New link', href: '/', visible: true },
                  ],
                })
              }
            >
              Add menu item
            </Button>

            <label style={label}>
              Featured products mode
              <select
                style={selectStyle}
                value={config.featuredMode}
                onChange={(e) =>
                  setConfig({ ...config, featuredMode: e.target.value as HomepageConfig['featuredMode'] })
                }
              >
                <option value="featured">Products marked featured</option>
                <option value="all">All products</option>
                <option value="manualIds">Manual selection</option>
              </select>
            </label>

            {config.featuredMode === 'manualIds' ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>Select products</strong>
                {products.map((p) => (
                  <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={(config.featuredProductIds || []).includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            ) : null}

            <label style={label}>
              Manual delivery SLA (minutes)
              <Input
                type="number"
                min={1}
                value={String(sla)}
                onChange={(e) => setSla(Number(e.target.value || 60))}
              />
            </label>

            {error ? <p style={{ color: 'var(--ns-danger)', margin: 0 }}>{error}</p> : null}
            {ok ? <p style={{ color: 'var(--ns-success)', margin: 0 }}>{ok}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save homepage'}
            </Button>
          </form>
        </Card>
      ) : null}
    </SellerShell>
  );
}
