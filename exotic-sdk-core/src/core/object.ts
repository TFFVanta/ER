import { nanoid } from "nanoid";
import type { ObjectStatus, ObjectType } from "./types.js";

export type UniversalObject = {
  id: string;
  address: string;
  type: ObjectType;
  subtype?: string;
  name: string;
  status: ObjectStatus;
  version: string;
  owner?: string;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
};

export function createUniversalObject(input: {
  type: ObjectType;
  name: string;
  subtype?: string;
  owner?: string;
  capabilities?: string[];
}): UniversalObject {
  const id = nanoid();
  const now = new Date().toISOString();
  const safeName = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id,
    address: `exo://${input.type}/${safeName}-${id}`,
    type: input.type,
    subtype: input.subtype,
    name: input.name,
    status: "new",
    version: "0.1.0",
    owner: input.owner,
    capabilities: input.capabilities ?? ["readable", "searchable", "versioned", "observable"],
    createdAt: now,
    updatedAt: now
  };
}
