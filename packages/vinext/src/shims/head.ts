/**
 * next/head shim
 *
 * In the Pages Router, <Head> manages document <head> elements.
 * - On the server: collects elements into a module-level array that the
 *   dev-server reads after render and injects into the HTML <head>.
 * - On the client: uses useEffect + DOM manipulation.
 */
import React, { useEffect, Children, isValidElement } from "react";

interface HeadProps {
  children?: React.ReactNode;
}

// --- SSR head collection ---
// State uses a registration pattern so this module can be bundled for the
// browser. The ALS-backed implementation lives in head-state.ts (server-only).

let _ssrHeadElements: string[] = [];

let _getSSRHeadElements = (): string[] => _ssrHeadElements;
let _resetSSRHeadImpl = (): void => { _ssrHeadElements = []; };

/**
 * Register ALS-backed state accessors. Called by head-state.ts on import.
 * @internal
 */
export function _registerHeadStateAccessors(accessors: {
  getSSRHeadElements: () => string[];
  resetSSRHead: () => void;
}): void {
  _getSSRHeadElements = accessors.getSSRHeadElements;
  _resetSSRHeadImpl = accessors.resetSSRHead;
}

/** Reset the SSR head collector. Call before render. */
export function resetSSRHead(): void {
  _resetSSRHeadImpl();
}

/** Get collected head HTML. Call after render. */
export function getSSRHeadHTML(): string {
  return _getSSRHeadElements().join("\n  ");
}

/**
 * Tags allowed inside <head>. Anything else is silently dropped.
 * This prevents injection of dangerous elements like <iframe>, <object>, etc.
 */
const ALLOWED_HEAD_TAGS = new Set([
  "title", "meta", "link", "style", "script", "base", "noscript",
]);
const ALLOWED_HEAD_TAGS_LIST = Array.from(ALLOWED_HEAD_TAGS).join(", ");

/** Self-closing tags: no inner content, emit as <tag ... /> */
const SELF_CLOSING_HEAD_TAGS = new Set(["meta", "link", "base"]);

/**
 * Collect allowed, valid head children (tag + props) for reuse in SSR and client.
 * Ensures both paths use the same allowlist and validation.
 * In dev, warns once for disallowed tags.
 */
function getValidHeadChildren(children: React.ReactNode): Array<{ type: string; props: Record<string, unknown> }> {
  const out: Array<{ type: string; props: Record<string, unknown> }> = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || typeof child.type !== "string") return;
    if (!ALLOWED_HEAD_TAGS.has(child.type)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[vinext] <Head> ignoring disallowed tag <${child.type}>. Only ${ALLOWED_HEAD_TAGS_LIST} are allowed.`,
        );
      }
      return;
    }
    out.push({ type: child.type, props: child.props as Record<string, unknown> });
  });
  return out;
}

/**
 * Convert props + tag to an HTML string for SSR head injection.
 */
function headChildToHTML(tag: string, props: Record<string, unknown>): string {
  const attrs: string[] = [];
  let innerHTML = "";

  for (const [key, value] of Object.entries(props)) {
    if (key === "children") {
      if (typeof value === "string") innerHTML = escapeHTML(value);
    } else if (key === "dangerouslySetInnerHTML") {
      const html = value as { __html?: string };
      if (html?.__html) innerHTML = html.__html;
    } else if (key === "className") {
      attrs.push(`class="${escapeAttr(String(value))}"`);
    } else if (typeof value === "string") {
      attrs.push(`${key}="${escapeAttr(value)}"`);
    } else if (typeof value === "boolean" && value) {
      attrs.push(key);
    }
  }

  const attrStr = attrs.length ? " " + attrs.join(" ") : "";
  if (SELF_CLOSING_HEAD_TAGS.has(tag)) {
    return `<${tag}${attrStr} data-vinext-head="true" />`;
  }
  return `<${tag}${attrStr} data-vinext-head="true">${innerHTML}</${tag}>`;
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Component ---

function Head({ children }: HeadProps): null {
  const valid = getValidHeadChildren(children);

  // SSR path: collect HTML for later injection
  if (typeof window === "undefined") {
    for (const { type, props } of valid) {
      const html = headChildToHTML(type, props);
      if (html) _getSSRHeadElements().push(html);
    }
    return null;
  }

  // Client path: useEffect DOM manipulation (runs after hydration)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const elements: Element[] = [];

    document.querySelectorAll("[data-vinext-head]").forEach((el) => el.remove());

    for (const { type, props } of valid) {
      const domEl = document.createElement(type);
      for (const [key, value] of Object.entries(props)) {
        if (key === "children" && typeof value === "string") {
          domEl.textContent = value;
        } else if (key === "dangerouslySetInnerHTML") {
          // skip for safety on client
        } else if (key === "className") {
          domEl.setAttribute("class", String(value));
        } else if (key !== "children" && typeof value === "string") {
          domEl.setAttribute(key, value);
        } else if (typeof value === "boolean" && value) {
          domEl.setAttribute(key, "");
        }
      }
      domEl.setAttribute("data-vinext-head", "true");
      document.head.appendChild(domEl);
      elements.push(domEl);
    }

    return () => elements.forEach((el) => el.remove());
  }, [children]);

  return null;
}

export default Head;
