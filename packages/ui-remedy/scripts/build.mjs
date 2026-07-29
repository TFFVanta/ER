import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildComponentKit } from "../../../tooling/build-component-kit.mjs";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await buildComponentKit(pkgRoot, "@exotic/ui-remedy");
