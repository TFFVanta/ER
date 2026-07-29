export interface VentureRegistryEntry {
  name: string;
  /** Directory name under <repoRoot>/.exotic/ holding this venture's bridge files. */
  bridgeDirName: string;
  /** Env var that overrides the default path, if this venture's bridge supports one. */
  bridgeRootEnvVar?: string;
}

// The one place that answers "what ventures does this company track" - previously each
// venture was a separate hardcoded summarizeVenture() call inline in apps/forge's CLI, so
// adding a new one meant editing that function's source instead of registering data here.
export const ventureRegistry: readonly VentureRegistryEntry[] = [
  { name: "EXOTIC", bridgeDirName: "codex-bridge", bridgeRootEnvVar: "EXOTIC_BRIDGE_ROOT" },
  { name: "Exotic Remedy", bridgeDirName: "exotic-remedy-bridge" },
];
