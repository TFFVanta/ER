import type { LiveMetadata } from "./metadata.js";

export type ProtectionDecision = {
  allowed: boolean;
  reason: string;
  requiredAudit: boolean;
};

export class ProtectionGate {
  canRead(metadata: LiveMetadata, actorRole: string): ProtectionDecision {
    if (metadata.protection.accessLevel === "public") return allow("public object");
    if (metadata.protection.accessLevel === "private" && ["owner", "admin", "engine"].includes(actorRole)) return allow("private access granted");
    if (metadata.protection.accessLevel === "restricted" && ["admin", "engine"].includes(actorRole)) return allow("restricted access granted");
    if (metadata.protection.accessLevel === "sealed" && actorRole === "admin") return allow("sealed admin access granted");
    return deny(`access denied for role ${actorRole}`, metadata.protection.auditRequired);
  }

  canMove(metadata: LiveMetadata, targetLayer: string, actorRole: string): ProtectionDecision {
    const read = this.canRead(metadata, actorRole);
    if (!read.allowed) return read;
    if (!metadata.movement.movable) return deny("object is not movable", true);
    if (metadata.protection.accessLevel === "sealed" && targetLayer !== "vault") return deny("sealed objects must remain in vault", true);
    return allow(`move allowed to ${targetLayer}`);
  }
}

function allow(reason: string): ProtectionDecision {
  return { allowed: true, reason, requiredAudit: false };
}

function deny(reason: string, requiredAudit = true): ProtectionDecision {
  return { allowed: false, reason, requiredAudit };
}
