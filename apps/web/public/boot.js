// Runs before the page paints: marks that JavaScript is on, so the pre-rendered
// copy of the page (for crawlers and no-JS visitors) stays hidden while the app loads.
document.documentElement.classList.add("js");
