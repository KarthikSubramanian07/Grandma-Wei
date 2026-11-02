import { useEffect } from "react";
import { InkDefs } from "./components/Grandma";
import { Seal } from "./components/Seal";
import { pendingSeq } from "./lib/pending";
import { onLinkClick, usePath } from "./lib/router";
import { useToast } from "./lib/toast";
import { Fridge } from "./pages/Fridge";
import { Home } from "./pages/Home";
import { How } from "./pages/How";
import { Privacy } from "./pages/Privacy";
import { Reading } from "./pages/Reading";
import { Share } from "./pages/Share";

function route(path: string) {
  let m: RegExpMatchArray | null;
  if (path === "/read") return <Reading key={`read-${pendingSeq()}`} source={{ kind: "photo" }} />;
  if ((m = path.match(/^\/practice\/([a-z]+)\/?$/))) return <Reading key={path} source={{ kind: "practice", name: m[1]! }} />;
  if ((m = path.match(/^\/visit\/([A-Za-z0-9_-]+)\/?$/))) return <Reading key={path} source={{ kind: "visit", id: m[1]! }} />;
  if ((m = path.match(/^\/s\/([A-Za-z0-9_-]+)\/?$/))) return <Share key={path} id={m[1]!} />;
  if (path === "/fridge") return <Fridge />;
  if (path === "/how") return <How />;
  if (path === "/privacy") return <Privacy />;
  return <Home />;
}

export function App() {
  const path = usePath();
  const msg = useToast();
  useEffect(() => {
    document.documentElement.dataset.route = path.split("/")[1] || "home";
  }, [path]);
  const nav = (href: string, label: string) => (
    <a href={href} onClick={onLinkClick} aria-current={path === href ? "page" : undefined} className="mono">
      {label}
    </a>
  );
  return (
    <>
      <InkDefs />
      <a className="skip sr-only" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a href="/" onClick={onLinkClick} className="wordmark" aria-label="Grandma Wei, home">
          <Seal size={22} rotate={0} className="chop" />
          <span>
            Grandma <em>Wei</em>
          </span>
        </a>
        <nav className="nav" aria-label="Main">
          {nav("/how", "How she judges")}
          {nav("/fridge", "Fridge")}
        </nav>
      </header>
      <div id="main">{route(path)}</div>
      <footer className="footer shell">
        <span>
          Made with love and mild disappointment. Not affiliated with any real grandmother.
        </span>
        <span className="footer-links">
          <a href="/privacy" onClick={onLinkClick}>
            Privacy
          </a>
          <a href="https://github.com/KarthikSubramanian07/Grandma-Wei" target="_blank" rel="noreferrer">
            Source
          </a>
        </span>
      </footer>
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </>
  );
}
