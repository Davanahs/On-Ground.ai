import { initialSeedData, localLeads, localTasks, tomorrowStr } from './seed.js';

const STORAGE_KEY = 'oncall.db.v1';

const defaultSettings = {
  agentName: 'John Doe',
  agentPhone: '+919999900000'
};

function getStorage() {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

// Load state from localStorage or initialize with seed data
function loadInitialState() {
  const storage = getStorage();
  try {
    if (storage) {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.tasks && parsed.leads && parsed.calls) {
          if (!parsed.settings) parsed.settings = defaultSettings;

          // Merge local private contacts into cached state if missing
          localLeads.forEach((ll) => {
            if (!parsed.leads.some((l) => l.id === ll.id || l.phone.replace(/\s+/g, '') === ll.phone.replace(/\s+/g, ''))) {
              parsed.leads.unshift(ll);
            }
          });

          localTasks.forEach((lt) => {
            if (!parsed.tasks.some((t) => t.id === lt.id || t.phone.replace(/\s+/g, '') === lt.phone.replace(/\s+/g, ''))) {
              parsed.tasks.unshift(lt);
            }
          });

          saveToStorage(parsed);
          return parsed;
        }
      }
    }
  } catch (err) {
    // Suppress console warning in test environments without DOM
  }

  const initial = { ...initialSeedData, settings: defaultSettings };
  saveToStorage(initial);
  return initial;
}

function saveToStorage(data) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Ignore storage errors in test runner
  }
}

// In-memory state and event listeners
let dbState = loadInitialState();
const listeners = new Set();

function notifySubscribers() {
  saveToStorage(dbState);
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in subscriber listener', e);
    }
  });
}

/**
 * Repository interface for database operations
 */
export const db = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot() {
    return dbState;
  },

  reset() {
    dbState = { ...JSON.parse(JSON.stringify(initialSeedData)), settings: defaultSettings };
    notifySubscribers();
  },

  // Agent Settings
  updateSettings(newSettings) {
    dbState = {
      ...dbState,
      settings: { ...dbState.settings, ...newSettings }
    };
    notifySubscribers();
  },

  // Task Mutations
  updateTask(taskId, updates) {
    dbState = {
      ...dbState,
      tasks: dbState.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    };
    notifySubscribers();
  },

  // Core requirement: Log call outcome for human calls
  // Transitions allowed: Missed -> Follow-up -> Completed
  logCallOutcome(taskId, { outcome, note, dueDate, fallbackTask }) {
    let task = dbState.tasks.find((t) => t.id === taskId);
    if (!task && fallbackTask) {
      // Quick-dial / lead calls have no task yet: create it so the outcome is not lost
      task = { ...fallbackTask, type: 'missed', attempts: 1 };
      dbState = { ...dbState, tasks: [task, ...dbState.tasks] };
    }
    if (!task) return;

    const nowFormatted = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    let updatedType = task.type;
    let updatedAttempts = task.attempts || 1;
    let updatedDueDate = task.dueDate;
    let updatedNote = task.note || '';

    if (outcome === 'no_answer') {
      updatedAttempts += 1;
      updatedDueDate = tomorrowStr;
    } else if (outcome === 'spoke_followup') {
      updatedType = 'followup';
      updatedDueDate = dueDate || tomorrowStr;
      updatedNote = note || updatedNote;
    } else if (outcome === 'spoke_done') {
      updatedType = 'completed';
      if (note) updatedNote = note;
    }

    const updatedTasks = dbState.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            type: updatedType,
            attempts: updatedAttempts,
            dueDate: updatedDueDate,
            note: updatedNote,
            lastCallAt: `Today ${nowFormatted}`
          }
        : t
    );

    // Create call record
    const newCall = {
      id: 'c_' + Date.now(),
      taskId: task.id,
      leadName: task.name,
      phone: task.phone,
      type: 'Outgoing',
      outcome: outcome,
      timestamp: `Today ${nowFormatted}`,
      duration: outcome === 'no_answer' ? '00:00' : '02:15',
      note: note || (outcome === 'no_answer' ? 'No answer / Call dropped' : 'Call completed'),
      transcript: []
    };

    dbState = {
      ...dbState,
      tasks: updatedTasks,
      calls: [newCall, ...dbState.calls]
    };

    notifySubscribers();
  },

  // Add Call
  addCall(callData) {
    const transcriptText = (callData.transcript || []).join(' ');
    const needs = callData.needs ? [...callData.needs] : [];
    const buyingSignals = callData.buyingSignals ? [...callData.buyingSignals] : [];
    const objections = callData.objections ? [...callData.objections] : [];

    if (/emi|finance|budget|price|cost/i.test(transcriptText)) {
      if (!needs.includes('0% no-cost EMI options')) needs.push('0% no-cost EMI options');
      if (!buyingSignals.includes('EMI inquiry')) buyingSignals.push('Inquired about financing options');
    }
    if (/warrant|trial/i.test(transcriptText)) {
      if (!needs.includes('10-year warranty & 100-night trial')) needs.push('10-year warranty & 100-night trial');
    }
    if (/visit|store|try|showroom/i.test(transcriptText)) {
      if (!needs.includes('Showroom visit')) needs.push('Showroom visit');
      if (!buyingSignals.includes('Interested in showroom trial')) buyingSignals.push('Interested in showroom trial');
    }

    const newCall = {
      id: 'c_' + Date.now(),
      timestamp: `Today ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      duration: '01:30',
      summary: callData.note || 'AI Call completed with Avani',
      needs: needs.length > 0 ? needs : ['General enquiry'],
      buyingSignals: buyingSignals.length > 0 ? buyingSignals : ['Inquired about product details'],
      objections,
      transcript: [],
      ...callData
    };

    dbState = {
      ...dbState,
      calls: [newCall, ...dbState.calls]
    };

    notifySubscribers();
    return newCall;
  },

  // Add Lead
  addLead(leadData) {
    const newLead = {
      id: 'lead_' + Date.now(),
      score: 85,
      status: 'High',
      signals: [['Manual Test Call', 'Added via manual test call studio']],
      ...leadData
    };

    dbState = {
      ...dbState,
      leads: [newLead, ...dbState.leads]
    };

    notifySubscribers();
    return newLead;
  },

  // Add Task
  addTask(taskData) {
    const newTask = {
      id: 'task_' + Date.now(),
      type: 'missed',
      attempts: 1,
      dueDate: new Date().toISOString().split('T')[0],
      ...taskData
    };

    dbState = {
      ...dbState,
      tasks: [newTask, ...dbState.tasks]
    };

    notifySubscribers();
    return newTask;
  },

  // Add Chat Message
  addMessage(channelId, text, isMe = true) {
    const newMsg = {
      id: 'm_' + Date.now(),
      channelId,
      sender: isMe ? (dbState.settings?.agentName || 'John Doe') : 'Agent',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      text,
      isMe
    };

    dbState = {
      ...dbState,
      messages: [...dbState.messages, newMsg]
    };

    notifySubscribers();
  }
};
