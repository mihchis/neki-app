export interface SM2Result {
  interval: number; // in days
  easeFactor: number;
  repetitions: number;
  dueDate: number; // timestamp of due date
}

/**
 * SuperMemo 2 (SM-2) Spaced Repetition Algorithm
 * 
 * @param quality 0: Again, 3: Hard, 4: Good, 5: Easy
 * @param prevInterval Previous interval in days
 * @param prevEaseFactor Previous ease factor
 * @param prevRepetitions Previous consecutive correct responses count
 */
export function calculateSM2(
  quality: 0 | 3 | 4 | 5,
  prevInterval: number,
  prevEaseFactor: number,
  prevRepetitions: number
): SM2Result {
  let interval = 1;
  let easeFactor = prevEaseFactor;
  let repetitions = prevRepetitions;

  if (quality === 0) {
    // Again (Wrong answer): reset repetitions, set interval to 1 day, decrease ease factor
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, prevEaseFactor - 0.2);
  } else if (quality === 3) {
    // Hard: advance but slower. Reduce ease factor, scale interval by 1.2
    repetitions = Math.max(1, prevRepetitions);
    interval = Math.max(1, Math.ceil(prevInterval * 1.2));
    easeFactor = Math.max(1.3, prevEaseFactor - 0.15);
  } else if (quality === 4) {
    // Good: standard SM-2 progression
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.ceil(prevInterval * prevEaseFactor);
    }
    repetitions++;
  } else if (quality === 5) {
    // Easy: jump ahead. Increase ease factor, scale interval with bonus
    if (repetitions === 0) {
      interval = 3;
    } else if (repetitions === 1) {
      interval = 8;
    } else {
      interval = Math.ceil(prevInterval * prevEaseFactor * 1.3);
    }
    repetitions++;
    easeFactor = Math.min(3.0, prevEaseFactor + 0.15);
  }

  // Calculate new due date (add 'interval' days)
  const now = new Date();
  // Clear hours, minutes, seconds for clean day-based scheduling
  now.setHours(0, 0, 0, 0);
  const millisecondsInADay = 24 * 60 * 60 * 1000;
  const dueDate = now.getTime() + interval * millisecondsInADay;

  return {
    interval,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    repetitions,
    dueDate,
  };
}
