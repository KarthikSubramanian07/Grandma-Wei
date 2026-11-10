# Accessibility

Grandma Wei aims for **WCAG 2.2 Level AA** on the web app (`apps/web`).

## What was tested

- axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) at 1440×900, 390×844 and 320×800 on home (including the camera sheet), how, about, privacy, contact, fridge, practice readings (with chores and sketch), and 404.
- Keyboard: tab order, skip link, camera dialog Escape / focus trap / restore, chore checkboxes, photo/sketch tabs.
- Manual: landmarks and headings, names and states, target size, reflow at 320px, text spacing, `prefers-reduced-motion`, pause for the home remarks and sketch energy flow.

## Known limitations

- The in-app camera needs a real camera permission; headless audits open the sheet but cannot exercise a live capture.
- Shared-link and live photo-read paths need the API and (for photos) a vision provider; practice rooms cover the reading UI without those.
- Canvas sketch energy flow is summarized with an `aria-label` and a pause control; it is not a full screen-reader walkthrough of particle positions.

## Reporting a barrier

Open an issue on [KarthikSubramanian07/Grandma-Wei](https://github.com/KarthikSubramanian07/Grandma-Wei) and describe the page, assistive tech, and what went wrong.
