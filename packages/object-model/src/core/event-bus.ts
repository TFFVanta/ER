import crypto from "node:crypto";
import type { MetadataEventType } from "./types";

export type MetadataEvent = {
  id: string;
  type: MetadataEventType;
  objectId: string;
  payload?: Record<string, unknown>;
  actor?: string;
  createdAt: string;
};

type Handler = (event: MetadataEvent) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<MetadataEventType | "*", Set<Handler>>();

  subscribe(type: MetadataEventType | "*", handler: Handler): () => void {
    const set = this.handlers.get(type) ?? new Set<Handler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }

  async emit(event: Omit<MetadataEvent, "id" | "createdAt">): Promise<MetadataEvent> {
    const fullEvent: MetadataEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    const exact = this.handlers.get(fullEvent.type) ?? new Set();
    const all = this.handlers.get("*") ?? new Set();

    await Promise.all([...exact, ...all].map((handler) => handler(fullEvent)));
    return fullEvent;
  }
}
