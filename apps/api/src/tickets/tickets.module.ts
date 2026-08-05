import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken } from '../auth/auth.module';
import { WorkspaceGuardService, CatalogModule } from '../catalog/catalog.module';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceGuardService,
  ) {}

  private async customerFromSession(raw?: string) {
    if (!raw) throw new UnauthorizedException('Missing session');
    const session = await this.prisma.customerSession.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: { customer: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid session');
    }
    return session.customer;
  }

  async createCustomerTicket(
    sessionToken: string,
    body: { subject: string; body: string; kind?: string; orderId?: string },
  ) {
    const customer = await this.customerFromSession(sessionToken);
    if (!body.subject?.trim() || !body.body?.trim()) throw new BadRequestException('subject and body required');
    return this.prisma.ticket.create({
      data: {
        workspaceId: customer.workspaceId,
        customerId: customer.id,
        orderId: body.orderId || null,
        kind: body.kind || 'support',
        subject: body.subject.trim(),
        messages: {
          create: {
            authorKind: 'customer',
            authorId: customer.id,
            body: body.body.trim(),
          },
        },
      },
      include: { messages: true },
    });
  }

  async listCustomerTickets(sessionToken: string) {
    const customer = await this.customerFromSession(sessionToken);
    return this.prisma.ticket.findMany({
      where: { customerId: customer.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createSellerTicket(
    userId: string,
    workspaceId: string,
    body: { subject: string; body: string; kind?: string; orderId?: string },
  ) {
    await this.access.requireMember(userId, workspaceId);
    if (!body.subject?.trim() || !body.body?.trim()) throw new BadRequestException('subject and body required');
    return this.prisma.ticket.create({
      data: {
        workspaceId,
        userId,
        orderId: body.orderId || null,
        kind: body.kind || 'support',
        subject: body.subject.trim(),
        messages: {
          create: {
            authorKind: 'seller',
            authorId: userId,
            body: body.body.trim(),
          },
        },
      },
      include: { messages: true },
    });
  }

  async listSellerTickets(userId: string, workspaceId: string) {
    await this.access.requireMember(userId, workspaceId);
    return this.prisma.ticket.findMany({
      where: { workspaceId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, customer: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async replySeller(userId: string, workspaceId: string, ticketId: string, body: string) {
    await this.access.requireMember(userId, workspaceId);
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, workspaceId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorKind: 'seller',
        authorId: userId,
        body: body.trim(),
      },
    });
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'answered', updatedAt: new Date() },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async listPlatform(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u || u.role !== 'super_admin') throw new UnauthorizedException('Super admin only');
    return this.prisma.ticket.findMany({
      include: { messages: { orderBy: { createdAt: 'asc' } }, customer: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async replyPlatform(userId: string, ticketId: string, body: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u || u.role !== 'super_admin') throw new UnauthorizedException('Super admin only');
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorKind: 'super_admin',
        authorId: userId,
        body: body.trim(),
      },
    });
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'answered', updatedAt: new Date() },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }
}

@Controller('customer/tickets')
export class CustomerTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@Headers('x-customer-session') session: string) {
    return this.tickets.listCustomerTickets(session);
  }

  @Post()
  create(
    @Headers('x-customer-session') session: string,
    @Body() body: { subject: string; body: string; kind?: string; orderId?: string },
  ) {
    return this.tickets.createCustomerTicket(session, body);
  }
}

@Controller('admin/workspaces/:workspaceId/tickets')
@UseGuards(AuthGuard('jwt'))
export class SellerTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@Req() req: { user: { id: string } }, @Param('workspaceId') workspaceId: string) {
    return this.tickets.listSellerTickets(req.user.id, workspaceId);
  }

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Body() body: { subject: string; body: string; kind?: string; orderId?: string },
  ) {
    return this.tickets.createSellerTicket(req.user.id, workspaceId, body);
  }

  @Post(':id/reply')
  reply(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.tickets.replySeller(req.user.id, workspaceId, id, body.body);
  }
}

@Controller('admin/platform/tickets')
@UseGuards(AuthGuard('jwt'))
export class PlatformTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.tickets.listPlatform(req.user.id);
  }

  @Post(':id/reply')
  reply(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.tickets.replyPlatform(req.user.id, id, body.body);
  }
}

@Module({
  imports: [CatalogModule],
  providers: [TicketsService],
  controllers: [CustomerTicketsController, SellerTicketsController, PlatformTicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}
