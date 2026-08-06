import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

export type UpdateStatus = {
  state: 'idle' | 'queued' | 'applying' | 'success' | 'failed' | string;
  message?: string;
  version?: string;
  at?: string;
};

function storageRoot() {
  return process.env.STORAGE_LOCAL_PATH || join('/data/storage');
}

@Injectable()
export class UpdatesService {
  private readonly log = new Logger(UpdatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  currentVersion() {
    return (
      process.env.NEOSTORE_VERSION ||
      process.env.npm_package_version ||
      '0.4.0'
    ).replace(/^v/, '') ;
  }

  currentTag() {
    const v = process.env.NEOSTORE_VERSION || 'latest';
    return v.startsWith('v') || v === 'latest' ? v : `v${v}`;
  }

  private requestPath() {
    return join(storageRoot(), 'update-request.json');
  }

  private statusPath() {
    return join(storageRoot(), 'update-status.json');
  }

  readHostStatus(): UpdateStatus {
    try {
      const p = this.statusPath();
      if (!existsSync(p)) return { state: 'idle', message: 'No updater status yet' };
      return JSON.parse(readFileSync(p, 'utf8')) as UpdateStatus;
    } catch {
      return { state: 'idle', message: 'Unable to read updater status' };
    }
  }

  async checkGithub() {
    const repo = process.env.GITHUB_REPO || 'neoauroraproject/neostore';
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'NeoStore-Updates',
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const latestRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
    if (!latestRes.ok) {
      throw new BadRequestException(`GitHub releases unavailable (HTTP ${latestRes.status})`);
    }
    const latest = (await latestRes.json()) as {
      tag_name?: string;
      name?: string;
      html_url?: string;
      published_at?: string;
      body?: string;
    };

    const listRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=10`, { headers });
    const releases = listRes.ok
      ? ((await listRes.json()) as Array<{ tag_name?: string; name?: string; html_url?: string; published_at?: string }>)
      : [];

    const current = this.currentTag();
    const latestTag = latest.tag_name || '';
    const currentNorm = this.currentVersion().replace(/^v/, '');
    const latestNorm = latestTag.replace(/^v/, '');
    const updateAvailable = Boolean(latestTag) && latestNorm !== currentNorm;

    // Persist last check (best-effort)
    try {
      const row = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
      const value = { ...(typeof row?.value === 'object' && row?.value ? (row.value as object) : {}) } as Record<
        string,
        unknown
      >;
      value.lastUpdateCheck = {
        at: new Date().toISOString(),
        latestTag,
        current,
      };
      await this.prisma.platformSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', value: value as object },
        update: { value: value as object },
      });
    } catch (e) {
      this.log.warn(`persist lastUpdateCheck failed: ${e}`);
    }

    return {
      currentVersion: this.currentVersion(),
      currentTag: current,
      latest: {
        tag: latestTag,
        name: latest.name,
        url: latest.html_url,
        publishedAt: latest.published_at,
        notes: (latest.body || '').slice(0, 4000),
      },
      updateAvailable,
      releases: (releases || [])
        .filter((r) => r.tag_name)
        .map((r) => ({
          tag: r.tag_name,
          name: r.name,
          url: r.html_url,
          publishedAt: r.published_at,
        })),
      host: this.readHostStatus(),
      images: {
        api: `ghcr.io/neoauroraproject/neostore-api:${latestTag || 'latest'}`,
        storefront: `ghcr.io/neoauroraproject/neostore-storefront:${latestTag || 'latest'}`,
        admin: `ghcr.io/neoauroraproject/neostore-admin:${latestTag || 'latest'}`,
      },
      cliHint: 'sudo bash /opt/neostore/install/neostore.sh update',
    };
  }

  queueApply(version?: string) {
    const tag = (version || 'latest').trim() || 'latest';
    if (!/^(latest|v?\d+\.\d+\.\d+([-.][A-Za-z0-9.]+)?)$/.test(tag)) {
      throw new BadRequestException('Invalid version tag');
    }
    const normalized = tag === 'latest' ? 'latest' : tag.startsWith('v') ? tag : `v${tag}`;
    const root = storageRoot();
    if (!existsSync(root)) mkdirSync(root, { recursive: true });
    const payload = {
      version: normalized,
      requestedAt: new Date().toISOString(),
      source: 'admin-panel',
    };
    writeFileSync(this.requestPath(), JSON.stringify(payload, null, 2), 'utf8');
    const statusDir = dirname(this.statusPath());
    if (!existsSync(statusDir)) mkdirSync(statusDir, { recursive: true });
    writeFileSync(
      this.statusPath(),
      JSON.stringify(
        {
          state: 'queued',
          message: `Update to ${normalized} queued — host updater will pull images and recreate stack`,
          version: normalized,
          at: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
    this.log.log(`Update queued: ${normalized}`);
    return {
      ok: true,
      queued: true,
      version: normalized,
      host: this.readHostStatus(),
      note: 'The updater service pulls GHCR images and recreates containers. API entrypoint applies Prisma schema (incl. --accept-data-loss) on boot.',
    };
  }

  status() {
    return {
      currentVersion: this.currentVersion(),
      currentTag: this.currentTag(),
      host: this.readHostStatus(),
      pendingRequest: existsSync(this.requestPath()),
    };
  }
}
