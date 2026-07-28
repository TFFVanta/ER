import { useEffect, useState } from "react";

export const bridgeBaseUrl =
  import.meta.env.VITE_EXOTIC_BRIDGE_URL || "http://127.0.0.1:8787";

async function request(path, options = {}) {
  const response = await fetch(`${bridgeBaseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok)
    throw new Error(`Bridge request failed (${response.status}).`);
  return response.json();
}

export function useWorkspace() {
  const [state, setState] = useState({
    workspace: null,
    bridge: null,
    loading: true,
    error: "",
    updatedAt: null,
  });

  async function refresh() {
    setState((current) => ({
      ...current,
      loading: !current.workspace,
      error: "",
    }));
    try {
      const [workspace, bridge] = await Promise.all([
        request("/api/v1/bridge/workspace"),
        request("/api/v1/bridge/state"),
      ]);
      setState({
        workspace,
        bridge,
        loading: false,
        error: "",
        updatedAt: new Date(),
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "The EXOTIC bridge is offline.",
      }));
    }
  }

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 15000);
    return () => window.clearInterval(interval);
  }, []);

  async function setAutoMode(mode) {
    await request("/api/v1/bridge/auto-mode", {
      method: "POST",
      body: JSON.stringify({ mode }),
    });
    await refresh();
  }

  async function queueReview(entity) {
    await request("/api/v1/bridge/message", {
      method: "POST",
      body: JSON.stringify({
        author: "workspace-shell",
        kind: "review-request",
        message: `Review requested for ${entity.type} ${entity.id} from the unified workspace shell.`,
      }),
    });
    await refresh();
  }

  return { ...state, refresh, setAutoMode, queueReview };
}
