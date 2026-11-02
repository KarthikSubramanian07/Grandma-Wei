import { markdownToHtml, pageFor } from "@gw/site/src/index";
import { useEffect } from "react";

/** About and Contact: the same text agents and crawlers get, rendered in the app. */
export function Info({ path }: { path: "/about" | "/contact" }) {
  const page = pageFor(path)!;
  useEffect(() => {
    document.title = page.title;
  }, [page]);
  // Our own hand-written Markdown, converted with escaping: safe to inject.
  return <main className="shell prose info fade-in" dangerouslySetInnerHTML={{ __html: markdownToHtml(page.markdown) }} />;
}
