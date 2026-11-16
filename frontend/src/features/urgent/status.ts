/** Urgent request status predicates (mirror the backend UrgentStatus transitions). */
import type { UrgentStatus } from './types';

const TERMINAL: readonly UrgentStatus[] = ['completed', 'cancelled', 'unmatched', 'expired'];
const MATCHING: readonly UrgentStatus[] = ['searching', 'notifying', 'waiting'];
const CONVERSING: readonly UrgentStatus[] = ['accepted', 'in_progress'];

export const isTerminal = (s: UrgentStatus) => TERMINAL.includes(s);
/** Still looking for a doctor (the only states in which a doctor may accept). */
export const isMatching = (s: UrgentStatus) => MATCHING.includes(s);
/** Nobody is available or accepted yet; the request is kept open until `keep_open_until`. */
export const isWaiting = (s: UrgentStatus) => s === 'waiting';
/** The patient may cancel any request that is still open. */
export const canPatientCancel = (s: UrgentStatus) => !isTerminal(s);
/** Patient and accepted doctor can exchange messages. */
export const canMessage = (s: UrgentStatus) => CONVERSING.includes(s);
/** A thread exists once a doctor accepted; it stays readable after completion. */
export const hasThread = (s: UrgentStatus) => canMessage(s) || s === 'completed';
