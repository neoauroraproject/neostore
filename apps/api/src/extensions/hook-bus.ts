import { Injectable } from '@nestjs/common';
import type { HookName } from './types';

type HookFn = (input: Record<string, unknown>) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;

@Injectable()
export class HookBus {
  private hooks = new Map<HookName, { id: string; fn: HookFn; order: number }[]>();

  register(name: HookName, id: string, fn: HookFn, order = 100) {
    const list = this.hooks.get(name) || [];
    list.push({ id, fn, order });
    list.sort((a, b) => a.order - b.order);
    this.hooks.set(name, list);
  }

  async run<T extends Record<string, unknown>>(name: HookName, input: T): Promise<T> {
    let current: Record<string, unknown> = { ...input };
    for (const h of this.hooks.get(name) || []) {
      const out = await h.fn(current);
      if (out && typeof out === 'object') current = { ...current, ...out };
      if (current.__veto) {
        throw new Error(String(current.__vetoReason || `Hook ${h.id} vetoed ${name}`));
      }
    }
    return current as T;
  }
}
