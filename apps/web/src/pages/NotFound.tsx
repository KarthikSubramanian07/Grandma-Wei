import { Grandma } from "../components/Grandma";
import { onLinkClick } from "../lib/router";

/** A page that doesn't exist, in her words. */
export function NotFound() {
  return (
    <main className="shell trouble fade-in">
      <Grandma mood="unimpressed" size={140} />
      <p className="trouble-msg">This page doesn't exist. Like the floor in some rooms I've seen.</p>
      <a className="btn btn-paper" href="/" onClick={onLinkClick}>
        Back to the kitchen
      </a>
    </main>
  );
}
