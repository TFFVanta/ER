export { ok, err, createContext, executeThroughGate, identity as kernelIdentity } from "@exotic/kernel";
export type { ExoticOk, ExoticErr, ExoticResult, ExoticContext, ExoticGate } from "@exotic/kernel";
export { defineContract, identity as contractsIdentity } from "@exotic/contracts";
export type { ExoticContract } from "@exotic/contracts";
export { createEvent, createEventBus, identity as eventsIdentity } from "@exotic/events";
export type { ExoticEvent, ExoticEventHandler, ExoticEventBus } from "@exotic/events";

export const sdkIdentity = {
  name: "@exotic/sdk",
  tagline: "Everything Is Exotic.",
  includes: ["@exotic/kernel", "@exotic/contracts", "@exotic/events"]
};

export { defineModel, defineTool, defineAgent, identity as aiIdentity } from "@exotic/ai";
export type { ExoticModel, ExoticModelMessage, ExoticModelResponse, ExoticTool, ExoticAgent } from "@exotic/ai";

export { createKernelRuntime } from "@exotic/kernel";
export type { ExoticKernelRuntime } from "@exotic/kernel";
