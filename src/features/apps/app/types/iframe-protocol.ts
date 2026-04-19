/**
 * postMessage protocol between Bucomax dashboard (host) and iframe apps.
 *
 * Host → Iframe:
 *   bucomax:init       — context (tenant, user, locale, theme, token)
 *   bucomax:theme      — theme changed
 *
 * Iframe → Host:
 *   bucomax:navigate   — request navigation in the dashboard
 *   bucomax:toast      — show a toast notification
 *   bucomax:resize     — request container resize
 *   bucomax:ready      — iframe signals it's ready to receive init
 *   bucomax:token-request — iframe requests a fresh scoped token
 */

// ---------------------------------------------------------------------------
// Host → Iframe messages
// ---------------------------------------------------------------------------

export type BucomaxInitMessage = {
  type: "bucomax:init";
  payload: {
    tenantId: string;
    userId: string;
    locale: string;
    theme: "light" | "dark";
    token: string | null;
    appSlug: string;
    version: 1;
  };
};

export type BucomaxThemeMessage = {
  type: "bucomax:theme";
  payload: {
    theme: "light" | "dark";
  };
};

export type HostToIframeMessage = BucomaxInitMessage | BucomaxThemeMessage;

// ---------------------------------------------------------------------------
// Iframe → Host messages
// ---------------------------------------------------------------------------

export type BucomaxReadyMessage = {
  type: "bucomax:ready";
};

export type BucomaxNavigateMessage = {
  type: "bucomax:navigate";
  payload: {
    /** Path relative to dashboard root, e.g. "/dashboard/clients" */
    path: string;
  };
};

export type BucomaxToastMessage = {
  type: "bucomax:toast";
  payload: {
    variant: "success" | "error" | "info" | "warning";
    message: string;
    duration?: number;
  };
};

export type BucomaxResizeMessage = {
  type: "bucomax:resize";
  payload: {
    /** Desired height in pixels. 0 = auto (fill container). */
    height: number;
  };
};

export type BucomaxTokenRequestMessage = {
  type: "bucomax:token-request";
};

export type IframeToHostMessage =
  | BucomaxReadyMessage
  | BucomaxNavigateMessage
  | BucomaxToastMessage
  | BucomaxResizeMessage
  | BucomaxTokenRequestMessage;

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

const VALID_IFRAME_TYPES = new Set([
  "bucomax:ready",
  "bucomax:navigate",
  "bucomax:toast",
  "bucomax:resize",
  "bucomax:token-request",
]);

export function isIframeToHostMessage(data: unknown): data is IframeToHostMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as { type: unknown }).type === "string" &&
    VALID_IFRAME_TYPES.has((data as { type: string }).type)
  );
}
