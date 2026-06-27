export type ExoticOk<T> = { ok: true; value: T };
export type ExoticErr<E = string> = { ok: false; error: E };
export type ExoticResult<T, E = string> = ExoticOk<T> | ExoticErr<E>;

export type ExoticContext = {
  id: string;
  createdAt: number;
  tags: string[];
};

export type ExoticGate<T> = {
  name: string;
  check(input: T, context: ExoticContext): ExoticResult<T>;
};

export function ok<T>(value: T): ExoticOk<T> {
  return { ok: true, value };
}

export function err<E = string>(error: E): ExoticErr<E> {
  return { ok: false, error };
}

export function createContext(id = "exotic"): ExoticContext {
  return { id, createdAt: Date.now(), tags: [] };
}

export function executeThroughGate<T>(input: T, gate: ExoticGate<T>, context = createContext()): ExoticResult<T> {
  return gate.check(input, context);
}

export const identity = {
  name: "@exotic/kernel",
  tagline: "Everything Is Exotic."
};
