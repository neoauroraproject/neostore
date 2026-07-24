import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { PassportModule } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../extensions/event-bus';
import { HookBus } from '../extensions/hook-bus';
import { Role } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me',
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly events: EventBus,
    private readonly hooks: HookBus,
  ) {}

  async register(input: { email: string; password: string; name?: string; workspaceName?: string }) {
    const email = input.email.trim().toLowerCase();
    if (!email || !input.password) throw new BadRequestException('email and password required');
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('email already registered');

    await this.hooks.run('beforeLogin', { email, mode: 'register' });
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name || email.split('@')[0],
        role: Role.workspace_owner,
      },
    });

    const slugBase = (input.workspaceName || user.name || 'store')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'store';
    let slug = slugBase;
    let n = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${n++}`;
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        name: input.workspaceName || `${user.name}'s Store`,
        slug,
        members: { create: { userId: user.id, role: Role.workspace_owner } },
        store: {
          create: {
            title: input.workspaceName || `${user.name}'s Store`,
            slug,
            paymentConfig: {
              methods: { manual_bank: true, manual_crypto: true, cryptomus: false },
              cards: [],
            },
          },
        },
      },
      include: { store: true },
    });

    await this.events.emit('UserCreated', { userId: user.id, email });
    const token = await this.sign(user.id, user.role);
    return { token, user: this.publicUser(user), workspace };
  }

  async login(input: { email: string; password: string }) {
    await this.hooks.run('beforeLogin', { email: input.email, mode: 'login' });
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    await this.hooks.run('afterLogin', { userId: user.id });
    const token = await this.sign(user.id, user.role);
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: { include: { store: true } } },
    });
    return { token, user: this.publicUser(user), workspaces: memberships.map((m) => m.workspace) };
  }

  async telegramLogin(input: { telegramId: string; username?: string; name?: string; workspaceSlug?: string }) {
    const telegramId = String(input.telegramId || '').trim();
    if (!telegramId) throw new BadRequestException('telegramId required');
    let user = await this.prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          name: input.name || input.username || `tg_${telegramId}`,
          role: Role.customer,
        },
      });
      await this.events.emit('UserCreated', { userId: user.id, telegramId });
    }
    const token = await this.sign(user.id, user.role);
    return { token, user: this.publicUser(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: { include: { store: true } } },
    });
    return {
      user: this.publicUser(user),
      workspaces: memberships.map((m) => m.workspace),
    };
  }

  private async sign(sub: string, role: string) {
    return this.jwt.signAsync({ sub, role }, { expiresIn: '7d' });
  }

  private publicUser(user: { id: string; email: string | null; name: string | null; role: Role; telegramId: string | null }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      telegramId: user.telegramId,
    };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: { email: string; password: string; name?: string; workspaceName?: string }) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body);
  }

  @Post('telegram')
  telegram(@Body() body: { telegramId: string; username?: string; name?: string }) {
    return this.auth.telegramLogin(body);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }
}

export function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export function newRawToken(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
