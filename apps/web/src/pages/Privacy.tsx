/** Plain-language privacy. Short on purpose. */
export function Privacy() {
  return (
    <main className="shell prose fade-in">
      <header className="page-head">
        <h1>Your room, your business</h1>
        <p>Photos of your home are personal. Here is exactly what happens to yours.</p>
      </header>
      <ol className="privacy-list">
        <li>
          <strong>Your phone shrinks the photo first.</strong> It's resized and saved as a fresh JPEG in your browser, which
          removes hidden details like location and camera info, before anything is sent.
        </li>
        <li>
          <strong>Grandma's eyes look at it once.</strong> The photo goes to our server and on to Anthropic's Claude API, which
          describes the room as a list of facts (where the bed is, whether the floor is clear). The AI is told to ignore people
          and anything private, like papers or screens.
        </li>
        <li>
          <strong>Then it's forgotten.</strong> Our server never saves your photo and never logs it. Anthropic's handling of API
          data is described in its{" "}
          <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer">
            privacy policy
          </a>
          .
        </li>
        <li>
          <strong>Your history stays with you.</strong> Readings, photos and magnets on the fridge are stored in this browser
          only. Clear them any time from the fridge.
        </li>
        <li>
          <strong>Sharing is text only, and undoable.</strong> A shared link shows the scorecard (score, her words, the chores),
          never the photo. Deleting the reading from your fridge deletes the link too.
        </li>
        <li>
          <strong>No ads, no trackers, no accounts.</strong> We count how many readings happen per hour to stop abuse, using a
          scrambled code, never your IP address.
        </li>
      </ol>
      <p className="fine">
        Grandma Wei is an open-source project. You can read every line of how this works on{" "}
        <a href="https://github.com/KarthikSubramanian07/Grandma-Wei" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
    </main>
  );
}
