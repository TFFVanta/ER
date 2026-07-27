export interface ExoticTheme {
  name: string;
  background: string;
  foreground: string;
  border: string;
  sharp: boolean;
  staticTexture: boolean;
  enchanted: boolean;
}

export interface ExoticButton {
  id: string;
  label: string;
  icon: string;
}

export const ExoticUI = {
  theme: {
    name: "black-white-static-enchanted",
    background: "#000000",
    foreground: "#ffffff",
    border: "#ffffff",
    sharp: true,
    staticTexture: true,
    enchanted: true
  } satisfies ExoticTheme,

  buttons: [
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { id: "optimizer", label: "Optimizer", icon: "gauge" },
    { id: "observer", label: "Observer", icon: "activity" },
    { id: "mesh", label: "Mesh", icon: "network" },
    { id: "device", label: "Device", icon: "monitor" },
    { id: "network", label: "Network", icon: "wifi" },
    { id: "settings", label: "Settings", icon: "settings" }
  ] satisfies ExoticButton[]
};
