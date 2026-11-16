/**
 * Polling cadence (ms) of every urgent query: the one place to tune them. UI copy that names an
 * interval is checked against these values in tests/unit/urgent/dictionary.test.ts.
 */
export const POLL_MS = {
  availableDoctors: 15_000,
  homeBanner: 60_000,
  request: 5_000,
  messages: 4_000,
  doctorInbox: 10_000,
} as const;

/** Field limits mirrored from the API (specs/002-urgent-live-consultation/contracts/urgent-v2.md). */
export const LIMITS = {
  descriptionMin: 10,
  descriptionMax: 1000,
  locationDetailsMax: 500,
  messageMax: 1000,
  outcomeNoteMax: 2000,
  cancelReasonMax: 200,
  reportReasonMin: 5,
} as const;
