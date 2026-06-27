export type ExoticEvent<TPayload = unknown> = {
  type: string;
  payload: TPayload;
  createdAt: number;
};

export type ExoticEventHandler<TPayload = unknown> = (event: ExoticEvent<TPayload>) => void;

export type ExoticEventBus = {
  on<TPayload>(type: string, handler: ExoticEventHandler<TPayload>): void;
  emit<TPayload>(event: ExoticEvent<TPayload>): void;
};

export function createEvent<TPayload>(type: string, payload: TPayload): ExoticEvent<TPayload> {
  return { type, payload, createdAt: Date.now() };
}

export function createEventBus(): ExoticEventBus {
  const handlers = new Map<string, ExoticEventHandler[]>();
  return {
    on(type, handler) {
      const list = handlers.get(type) || [];
      list.push(handler as ExoticEventHandler);
      handlers.set(type, list);
    },
    emit(event) {
      for (const handler of handlers.get(event.type) || []) handler(event);
    }
  };
}

export const identity = {
  name: "@exotic/events",
  tagline: "Everything Is Exotic."
};
