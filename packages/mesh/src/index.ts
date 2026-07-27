export type MeshNodeType = "desktop" | "phone" | "server";
export type MeshNodeStatus = "online" | "offline";

export interface MeshNode {
  id: string;
  name: string;
  type: MeshNodeType;
  status: MeshNodeStatus;
  latency: number;
}

export const ExoticMesh = {
  nodes: [] as MeshNode[],

  register(node: MeshNode): MeshNode {
    this.nodes.push(node);
    return node;
  },

  online(): MeshNode[] {
    return this.nodes.filter(node => node.status === "online");
  },

  summary() {
    return {
      total: this.nodes.length,
      online: this.online().length
    };
  }
};
