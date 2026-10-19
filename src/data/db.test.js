import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db.js';

const byType = (t) => db.getSnapshot().tasks.find((x) => x.type === t);
const get = (id) => db.getSnapshot().tasks.find((x) => x.id === id);

beforeEach(() => db.reset());

describe('logCallOutcome', () => {
  it('no answer keeps task missed and adds an attempt', () => {
    const t = byType('missed');
    db.logCallOutcome(t.id, { outcome: 'no_answer' });
    const u = get(t.id);
    expect(u.type).toBe('missed');
    expect(u.attempts).toBe((t.attempts || 1) + 1);
  });
  it('follow-up moves task to followup with date and note', () => {
    const t = byType('missed');
    db.logCallOutcome(t.id, { outcome: 'spoke_followup', dueDate: '2030-01-05', note: 'send quote' });
    expect(get(t.id)).toMatchObject({ type: 'followup', dueDate: '2030-01-05', note: 'send quote' });
  });
  it('all done moves task to completed', () => {
    const t = byType('followup');
    db.logCallOutcome(t.id, { outcome: 'spoke_done' });
    expect(get(t.id).type).toBe('completed');
  });
  it('writes a call row', () => {
    const t = byType('missed');
    const before = db.getSnapshot().calls.length;
    db.logCallOutcome(t.id, { outcome: 'spoke_done' });
    expect(db.getSnapshot().calls.length).toBe(before + 1);
  });
  it('creates a task for an unknown quick-dial id', () => {
    db.logCallOutcome('quick_1', { outcome: 'spoke_followup', dueDate: '2030-01-05', fallbackTask: { id: 'quick_1', name: 'Direct', phone: '+919999900000', product: 'x' } });
    expect(get('quick_1').type).toBe('followup');
  });
});
