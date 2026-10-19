// Remembers "a tel: call was started" so the Outcome sheet opens only when the user
// really left the app (dialer) and came back - never right after the click.
const KEY = 'oncall.pendingCall';
export const MIN_AWAY_MS = 15000;          // away shorter than this = dialer cancelled, ignore
export const MAX_AGE_MS = 30 * 60 * 1000;  // older pending calls are discarded

const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } };
const write = (p) => { try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } };

export const startPending = (task) => write({ task, startedAt: Date.now(), hiddenAt: null });
export const peekPending = read;
export const markHidden = () => { const p = read(); if (p && !p.hiddenAt) write({ ...p, hiddenAt: Date.now() }); };
export const takePending = () => { const p = read(); try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } return p; };
// Explicit "log outcome now" (used after server-placed calls, where the user never leaves the app)
export const requestOutcome = (task) => window.dispatchEvent(new CustomEvent('oncall:open-outcome', { detail: task }));
