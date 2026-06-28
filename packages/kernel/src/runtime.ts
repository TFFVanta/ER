import { createRegistry } from "@exotic/registry";

export function createKernelRuntime() {
  const registry = createRegistry();
  return {
    registry,
    register: registry.register,
    get: registry.get,
    list: registry.list
  };
}

export type ExoticKernelRuntime = ReturnType<typeof createKernelRuntime>;
