import { ExoticObserver } from "@exotic/observer";
import { ExoticOptimizer } from "@exotic/optimizer";
import { ExoticMesh } from "@exotic/mesh";
import { ExoticDevice } from "@exotic/device";
import { ExoticNetwork } from "@exotic/network";

// This dashboard's own theme/nav config - previously imported from @exotic/ui's
// placeholder ExoticUI stub, which was removed when that package became a real component
// kit (see packages/ui/src/index.ts). This data was always dashboard-specific, not part of
// the UI library's public API, so it belongs here rather than as a compat re-export.
const dashboardTheme = {
  name: "black-white-static-enchanted",
  background: "#000000",
  foreground: "#ffffff",
  border: "#ffffff",
  sharp: true,
  staticTexture: true,
  enchanted: true,
};

const dashboardButtons = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "optimizer", label: "Optimizer", icon: "gauge" },
  { id: "observer", label: "Observer", icon: "activity" },
  { id: "mesh", label: "Mesh", icon: "network" },
  { id: "device", label: "Device", icon: "monitor" },
  { id: "network", label: "Network", icon: "wifi" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export const ExoticDashboard = {
  title: "EXOTIC",
  theme: dashboardTheme,
  buttons: dashboardButtons,

  snapshot() {
    const device = ExoticDevice.current();
    const network = ExoticNetwork.current();
    const metrics = ExoticObserver.collect();
    const optimization = ExoticOptimizer.run("balanced");

    return {
      title: this.title,
      theme: this.theme.name,
      device,
      network,
      metrics,
      mesh: ExoticMesh.summary(),
      optimization,
      status: "online"
    };
  }
};
