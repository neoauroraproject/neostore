import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  Module,
  Query,
  Redirect,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PlatformModule, PlatformService } from '../platform/platform.module';
import { PortalModule, PortalService } from '../portal/portal.module';
import { AuthModule, AuthService } from '../auth/auth.module';

type OAuthState = {
  role: 'customer' | 'seller';
  slug?: string;
  redirect?: string;
  nonce: string;
};

@Injectable()
export class GoogleOAuthService {
  private states = new Map<string, OAuthState & { exp: number }>();

  constructor(
    private readonly platform: PlatformService,
    private readonly portal: PortalService,
    private readonly auth: AuthService,
  ) {}

  private cleanup() {
    const now = Date.now();
    for (const [k, v] of this.states) {
      if (v.exp < now) this.states.delete(k);
    }
  }

  async start(query: { role?: string; slug?: string; redirect?: string }) {
    const settings = await this.platform.get();
    const oauth = settings.googleOAuth || {};
    if (!oauth.clientId) throw new BadRequestException('Google OAuth not configured');
    const role = query.role === 'seller' ? 'seller' : 'customer';
    if (role === 'customer' && !oauth.enabledForCustomers) {
      throw new BadRequestException('Google login disabled for customers');
    }
    if (role === 'seller' && !oauth.enabledForSellers) {
      throw new BadRequestException('Google login disabled for sellers');
    }
    this.cleanup();
    const stateKey = randomBytes(16).toString('hex');
    this.states.set(stateKey, {
      role,
      slug: query.slug,
      redirect: query.redirect,
      nonce: randomBytes(8).toString('hex'),
      exp: Date.now() + 10 * 60_000,
    });
    const apiPublic = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const redirectUri = `${apiPublic}/api/oauth/google/callback`;
    const params = new URLSearchParams({
      client_id: oauth.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: stateKey,
      access_type: 'online',
      prompt: 'select_account',
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  }

  async callback(code: string, stateKey: string) {
    const state = this.states.get(stateKey);
    this.states.delete(stateKey);
    if (!state || state.exp < Date.now()) throw new BadRequestException('Invalid OAuth state');
    const settings = await this.platform.get();
    const oauth = settings.googleOAuth || {};
    if (!oauth.clientId || !oauth.clientSecret) throw new BadRequestException('Google OAuth misconfigured');

    const apiPublic = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const redirectUri = `${apiPublic}/api/oauth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new BadRequestException(tokenJson.error || 'Google token exchange failed');
    }
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };
    if (!profile.sub || !profile.email) throw new BadRequestException('Google profile incomplete');

    if (state.role === 'customer') {
      const slug = state.slug;
      if (!slug) throw new BadRequestException('Store slug required for customer Google login');
      const session = await this.portal.loginOrRegisterGoogle(slug, {
        googleSub: profile.sub,
        email: profile.email,
        name: profile.name,
      });
      const storefront = (process.env.STOREFRONT_PUBLIC_URL || process.env.PUBLIC_STORE_URL || '/').replace(
        /\/$/,
        '',
      );
      const redirect =
        state.redirect || `${storefront}/portal?session=${encodeURIComponent(session.sessionToken)}`;
      return { redirect, session };
    }

    const result = await this.auth.loginOrRegisterGoogle({
      googleSub: profile.sub,
      email: profile.email,
      name: profile.name,
    });
    const admin = (process.env.ADMIN_PUBLIC_URL || '/admin').replace(/\/$/, '');
    const redirect = state.redirect || `${admin}/?google_token=${encodeURIComponent(result.token)}`;
    return { redirect, ...result };
  }
}

@Controller('oauth/google')
export class GoogleOAuthController {
  constructor(private readonly google: GoogleOAuthService) {}

  @Get('start')
  async start(
    @Query('role') role?: string,
    @Query('slug') slug?: string,
    @Query('redirect') redirect?: string,
  ) {
    return this.google.start({ role, slug, redirect });
  }

  @Get('callback')
  @Redirect()
  async callback(@Query('code') code: string, @Query('state') state: string) {
    if (!code || !state) throw new BadRequestException('code and state required');
    const result = await this.google.callback(code, state);
    return { url: result.redirect, statusCode: 302 };
  }
}

@Module({
  imports: [PlatformModule, PortalModule, AuthModule],
  providers: [GoogleOAuthService],
  controllers: [GoogleOAuthController],
})
export class GoogleOAuthModule {}
