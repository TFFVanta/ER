import { ExoticObserver } from "@exotic/observer";
import { ExoticOptimizer } from "@exotic/optimizer";
import { ExoticMesh } from "@exotic/mesh";
import { ExoticDevice } from "@exotic/device";
import { ExoticNetwork } from "@exotic/network";
import { ExoticUI } from "@exotic/ui";

export const ExoticDashboard = {
  title: "EXOTIC",
  theme: ExoticUI.theme,
  buttons: ExoticUI.buttons,

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

console.log(ExoticDashboard.snapshot());