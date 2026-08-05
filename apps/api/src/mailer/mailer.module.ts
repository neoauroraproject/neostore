import { BadRequestException, Injectable, Module } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

export type SmtpConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
};

@Injectable()
export class MailerService {
  constructor(private readonly prisma: PrismaService) {}

  async getSmtp(): Promise<SmtpConfig> {
    const row = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
    const value = (row?.value || {}) as { smtp?: SmtpConfig };
    return value.smtp || {};
  }

  private async transporter(): Promise<Transporter | null> {
    const smtp = await this.getSmtp();
    if (!smtp.host || !smtp.fromEmail) return null;
    return createTransport({
      host: smtp.host,
      port: Number(smtp.port || 587),
      secure: Boolean(smtp.secure),
      auth: smtp.user ? { user: smtp.user, pass: smtp.password || '' } : undefined,
    });
  }

  async send(input: { to: string; subject: string; text: string; html?: string }) {
    const smtp = await this.getSmtp();
    const tx = await this.transporter();
    if (!tx) {
      return { ok: false, skipped: true, reason: 'SMTP not configured' };
    }
    const from = smtp.fromName ? `${smtp.fromName} <${smtp.fromEmail}>` : smtp.fromEmail!;
    await tx.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true };
  }

  async sendTest(to: string) {
    if (!to) throw new BadRequestException('to required');
    const result = await this.send({
      to,
      subject: 'NeoStore SMTP test',
      text: 'Your SMTP settings work. NeoStore can send transactional email.',
      html: '<p>Your SMTP settings work. <strong>NeoStore</strong> can send transactional email.</p>',
    });
    if (result.skipped) throw new BadRequestException(result.reason);
    return result;
  }
}

@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
