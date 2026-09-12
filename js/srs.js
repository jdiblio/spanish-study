// Spaced-repetition scheduler, a simplified SM-2 (the algorithm behind Anki).
// Intervals grow each time you get a card right; a miss sends it back to the start.
import { DAY, startOfDay } from './app.js';

export const Rating = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

export function newCardState() {
  return { reps: 0, interval: 0, ease: 2.5, due: 0, lapses: 0, last: 0 };
}

export function isDue(cs, now = Date.now()) {
  return !!cs && cs.due <= now;
}

export function isMature(cs) {
  return !!cs && cs.interval >= 21;
}

/** Returns the new state for a card after rating it. Does not mutate the input. */
export function schedule(cs, rating, now = Date.now()) {
  const s = { ...(cs || newCardState()) };
  s.last = now;

  if (rating === Rating.AGAIN) {
    if (s.reps > 0) s.lapses++;
    s.reps = 0;
    s.interval = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now; // comes back in this same session
    return s;
  }

  let interval;
  if (s.reps === 0) {
    interval = rating === Rating.EASY ? 4 : 1;
  } else if (s.reps === 1) {
    interval = rating === Rating.EASY ? 7 : rating === Rating.HARD ? 2 : 3;
  } else if (rating === Rating.HARD) {
    interval = s.interval * 1.2;
  } else if (rating === Rating.GOOD) {
    interval = s.interval * s.ease;
  } else {
    interval = s.interval * s.ease * 1.3;
  }

  if (rating === Rating.HARD) s.ease = Math.max(1.3, s.ease - 0.15);
  if (rating === Rating.EASY) s.ease = s.ease + 0.15;

  interval = Math.max(1, Math.round(interval));
  if (s.reps >= 1 && interval <= s.interval) interval = s.interval + 1;

  s.interval = interval;
  s.reps++;
  s.due = startOfDay(new Date(now)) + interval * DAY;
  return s;
}

/** Interval (in days) each rating would give, for showing on the buttons. */
export function previewIntervals(cs, now = Date.now()) {
  return {
    [Rating.AGAIN]: 0,
    [Rating.HARD]: schedule(cs, Rating.HARD, now).interval,
    [Rating.GOOD]: schedule(cs, Rating.GOOD, now).interval,
    [Rating.EASY]: schedule(cs, Rating.EASY, now).interval,
  };
}
