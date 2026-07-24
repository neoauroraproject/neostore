import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { OfficialApiSurface } from './types';

@Injectable()
export class OfficialApi implements OfficialApiSurface {
  private readonly log = new Logger('OfficialApi');

  constructor(private readonly prisma: PrismaService) {}

  products = {
    list: async (workspaceId: string) =>
      this.prisma.product.findMany({ where: { workspaceId, visible: true } }),
  };

  orders = {
    get: async (workspaceId: string, orderId: string) =>
      this.prisma.order.findFirst({ where: { id: orderId, workspaceId } }),
  };

  settings = {
    get: async (workspaceId: string, key: string) => {
      const row = await this.prisma.workspaceExtension.findFirst({
        where: { workspaceId },
        include: { extension: true },
      });
      const settings = (row?.settings || {}) as Record<string, unknown>;
      return settings[key];
    },
    set: async (workspaceId: string, key: string, value: unknown) => {
      // Store under platform settings namespaced key for simplicity in P0
      const current = await this.prisma.platformSettings.findUnique({ where: { id: 'default' } });
      const valueObj = ((current?.value || {}) as Record<string, unknown>) || {};
      const ws = (valueObj[workspaceId] as Record<string, unknown>) || {};
      ws[key] = value;
      valueObj[workspaceId] = ws;
      const json = valueObj as Prisma.InputJsonValue;
      await this.prisma.platformSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', value: json },
        update: { value: json },
      });
    },
  };

  notifications = {
    notify: async (input: {
      workspaceId: string;
      customerId?: string;
      title: string;
      message: string;
      type: string;
    }) => {
      if (!input.customerId) {
        this.log.log(`[notify:${input.type}] ${input.title}`);
        return;
      }
      await this.prisma.customerNotification.create({
        data: {
          customerId: input.customerId,
          type: input.type,
          title: input.title,
          message: input.message,
          payload: { workspaceId: input.workspaceId },
        },
      });
    },
  };

  storage = {
    put: async (path: string, _data: Buffer | string) => {
      this.log.log(`storage.put ${path}`);
      return path;
    },
  };

  logger = {
    info: (msg: string, meta?: Record<string, unknown>) => this.log.log({ msg, ...meta }),
  };
}
