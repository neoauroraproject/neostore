import { Injectable } from '@nestjs/common';
import type { CoreEventName } from './types';

type Handler = (payload: Record<string, unknown>) => void | Promise<void>;

@Injectable()
export class EventBus {
  private handlers = new Map<CoreEventName | string, Handler[]>();

  on(event: CoreEventName | string, handler: Handler) {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
    return () => {
      this.handlers.set(
        event,
        (this.handlers.get(event) || []).filter((h) => h !== handler),
      );
    };
  }

  async emit(event: CoreEventName | string, payload: Record<string, unknown>) {
    const list = this.handlers.get(event) || [];
    for (const h of list) {
      await h(payload);
    }
  }
}
