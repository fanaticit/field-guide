// Helpers for code that sits around the Send to Challenges pop-up.

/** True when a click landed inside a Send to Challenges pop-up (for menus' outside-click checks). */
export const isInChallengePopup = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('[data-challenge-popup]'));
