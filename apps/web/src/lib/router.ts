import { useEffect, useState } from "react";

/** A tiny router: the app has six routes and doesn't need more than this. */
export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) history.replaceState(null, "", to);
  else history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

/** The current path. Re-renders on every navigation, even to the same path. */
export function usePath(): string {
  const [state, setState] = useState({ path: location.pathname, n: 0 });
  useEffect(() => {
    const on = () => setState((s) => ({ path: location.pathname, n: s.n + 1 }));
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return state.path;
}

/** Internal links without full page loads. */
export function onLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
  const a = e.currentTarget;
  if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank" || a.origin !== location.origin) return;
  e.preventDefault();
  navigate(a.pathname);
}
