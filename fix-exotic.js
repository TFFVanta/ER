const fs = require("fs");

function write(path, code) {
  fs.mkdirSync(path.split("\\").slice(0, -1).join("\\"), { recursive: true });
  fs.writeFileSync(path, code.trimStart(), "utf8");
}

write("packages\\observer\\src\\index.ts", `
export type ObserverMetric = {
  name: string;
  value: number;
  unit: string;
  safe: boolean;
};

export const ExoticObserver = {
  collect(): ObserverMetric[] {
    return [
      { name: "cpu", value: 0.23, unit: "load", safe: true },
      { name: "memory", value: 0.41, unit: "load", safe: true },
      { name: "temperature", value: 58, unit: "celsius", safe: true },
      { name: "networkLatency", value: 22, unit: "ms", safe: true }
    ];
  }
};
`);

write("packages\\optimizer\\src\\index.ts", `
export type OptimizationMode = "balanced" | "performance" | "battery" | "cooling" | "network";

export const ExoticOptimizer = {
  mode: "balanced" as OptimizationMode,
  safetyGate: true,
  boostLevel: 0.33,
  qualityScore: 1.0,

  run(mode: OptimizationMode = "balanced") {
    this.mode = mode;
    return {
      status: "optimized",
      mode,
      safetyGate: this.safetyGate,
      boostLevel: this.boostLevel
    };
  }
};
`);

write("packages\\mesh\\src\\index.ts", `
export interface MeshNode {
  id: string;
  name: string;
  type: "desktop" | "phone" | "server";
  status: "online" | "offline";
  latency: number;
}

export const ExoticMesh = {
  nodes: [] as MeshNode[],

  register(node: MeshNode) {
    this.nodes.push(node);
  },

  online() {
    return this.nodes.filter((n) => n.status === "online");
  },

  summary() {
    return {
      total: this.nodes.length,
      online: this.online().length
    };
  }
};
`);

write("packages\\device\\src\\index.ts", `
export type DeviceType = "desktop" | "phone" | "server";

export interface DeviceState {
  id: string;
  name: string;
  type: DeviceType;
  battery: number;
  charging: boolean;
  temperature: number;
  cpuLoad: number;
  memoryLoad: number;
  safe: boolean;
}

export const ExoticDevice = {
  current(): DeviceState {
    return {
      id: "local-desktop",
      name: "Exotic Desktop",
      type: "desktop",
      battery: 1.0,
      charging: true,
      temperature: 58,
      cpuLoad: 0.23,
      memoryLoad: 0.41,
      safe: true
    };
  }
};
`);

write("packages\\network\\src\\index.ts", `
export interface NetworkState {
  connected: boolean;
  latencyMs: number;
  jitterMs: number;
  packetLoss: number;
  bandwidthMbps: number;
  stabilityScore: number;
}

export const ExoticNetwork = {
  current(): NetworkState {
    return {
      connected: true,
      latencyMs: 22,
      jitterMs: 4,
      packetLoss: 0.0,
      bandwidthMbps: 120,
      stabilityScore: 0.97
    };
  },

  score(state: NetworkState) {
    return state.connected ? state.stabilityScore : 0;
  }
};
`);

write("packages\\ui\\src\\index.ts", `
export type ExoticButton = {
  id: string;
  label: string;
  icon: string;
};

export const ExoticUI = {
  theme: {
    name: "black-white-static-enchanted",
    background: "#000000",
    foreground: "#ffffff",
    border: "#ffffff",
    sharp: true,
    staticTexture: true,
    enchanted: true
  },

  buttons: [
    { id: "dashboard", label: "Dashboard", icon: "◆" },
    { id: "optimizer", label: "Optimizer", icon: "⚡" },
    { id: "observer", label: "Observer", icon: "◉" },
    { id: "mesh", label: "Mesh", icon: "✦" },
    { id: "device", label: "Device", icon: "▣" },
    { id: "network", label: "Network", icon: "≋" },
    { id: "settings", label: "Settings", icon: "⚙" }
  ] as ExoticButton[]
};
`);

console.log("Exotic core package files repaired.");