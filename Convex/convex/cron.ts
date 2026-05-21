import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'processScheduledWhispers',
  { minutes: 1 },
  internal.whispers.processScheduledWhispers
);

crons.interval(
  'cleanupTypingIndicators',
  { minutes: 5 },
  internal.rateLimits.cleanupTypingIndicators
);

crons.daily(
  'cleanupOldRateLimits',
  { hourUTC: 3, minuteUTC: 0 },
  internal.rateLimits.cleanupOldRateLimits
);

crons.weekly(
  'cleanupOrphanedFiles',
  { dayOfWeek: 'sunday', hourUTC: 4, minuteUTC: 0 },
  internal.fileStorage.cleanupOrphanedFiles
);

crons.monthly(
  'cleanupMysteryWhisperLimits',
  { day: 1, hourUTC: 5, minuteUTC: 0 },
  internal.mysteryWhispers.cleanupOldLimits
);

export default crons;
