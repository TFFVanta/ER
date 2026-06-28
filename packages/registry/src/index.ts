export type ExoticRegistryItem<T = unknown> = {
  id: string;
  type: string;
  name: string;
  value: T;
};

export function createRegistry() {
  const items = new Map<string, ExoticRegistryItem>();
  return {
    register<T>(item: ExoticRegistryItem<T>) { items.set(item.id, item); return item; },
    get<T = unknown>(id: string) { return items.get(id) as ExoticRegistryItem<T> | undefined; },
    list() { return Array.from(items.values()); },
    has(id: string) { return items.has(id); },
    remove(id: string) { return items.delete(id); }
  };
}

export const identity = { name: "@exotic/registry", tagline: "Everything Is Exotic." };
