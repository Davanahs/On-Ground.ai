import { localDateStr } from '../utils/date.js';

// Helper to get formatted ISO date string (YYYY-MM-DD) relative to today
const getRelativeDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return localDateStr(d);
};

export const todayStr = getRelativeDate(0);
export const tomorrowStr = getRelativeDate(1);
export const yesterdayStr = getRelativeDate(-1);

// Safely load git-ignored local contacts if present
const localModules = import.meta.glob('./local-contacts.js', { eager: true });
const localContacts = localModules['./local-contacts.js']?.default || [];

export const localLeads = localContacts.map((c, i) => ({
  id: `local_lead_${i}`,
  name: c.name,
  phone: c.phone,
  score: 95,
  status: 'High',
  product: 'Ortho GRID Mattress',
  value: 120000,
  intent: 90,
  signals: [['Direct Lead', 'Priority contact added via local private contacts']]
}));

export const localTasks = localContacts.map((c, i) => ({
  id: `local_task_${i}`,
  leadId: `local_lead_${i}`,
  name: c.name,
  phone: c.phone,
  type: 'missed',
  attempts: 1,
  dueDate: todayStr,
  product: 'Ortho GRID Mattress',
  value: 120000,
  note: 'Priority contact ready for live calling test',
  lastCallAt: 'Today 10:00 AM'
}));

export const initialSeedData = {
  leads: [
    ...localLeads,
    {
      id: 'l1',
      name: 'Arjun Mehta',
      phone: '+91 98000 00001',
      score: 92,
      status: 'High',
      product: 'Ortho GRID Mattress',
      value: 120000,
      intent: 87,
      signals: [
        ['Financing', 'Asked about 0% EMI options - high purchasing intent'],
        ['Quotation', 'Compared specifications with a competitor mattress'],
        ['Trial Period', 'Inquired about the 100-night risk-free home trial']
      ]
    },
    {
      id: 'l2',
      name: 'Sneha Iyer',
      phone: '+91 87654 32109',
      score: 87,
      status: 'High',
      product: 'Smart Adjustable Mattress',
      value: 98000,
      intent: 82,
      signals: [
        ['Quotation', 'Requested official quote with GST breakdown'],
        ['Delivery', 'Needs expedited delivery to Bengaluru address']
      ]
    },
    {
      id: 'l3',
      name: 'Rohit Sharma',
      phone: '+91 76543 21098',
      score: 76,
      status: 'Medium',
      product: 'Ergonomic Recliner',
      value: 85000,
      intent: 71,
      signals: [
        ['Competitor Match', 'Considering a rival brand offer, needs price match'],
        ['Warranty', 'Checked detailed warranty terms on website']
      ]
    },
    {
      id: 'l4',
      name: 'Priya Nair',
      phone: '+91 65432 10987',
      score: 62,
      status: 'Medium',
      product: 'Duroflex Pro Comfort',
      value: 64000,
      intent: 58,
      signals: [
        ['Store Visit', 'Planning to visit physical showroom next weekend']
      ]
    },
    {
      id: 'l5',
      name: 'Vikram Singh',
      phone: '+91 54321 09876',
      score: 48,
      status: 'Low',
      product: 'Premium Pillow Set',
      value: 22000,
      intent: 42,
      signals: [
        ['General Inquiry', 'Browsed accessory section on website']
      ]
    },
    {
      id: 'l6',
      name: 'Faizan A.',
      phone: '+91 98111 22334',
      score: 85,
      status: 'High',
      product: 'Ortho GRID Mattress',
      value: 24500,
      intent: 80,
      signals: [
        ['Missed Call', 'Called during peak hours; call was dropped']
      ]
    },
    {
      id: 'l7',
      name: 'Kavitha R.',
      phone: '+91 90000 11111',
      score: 79,
      status: 'Medium',
      product: 'Ortho GRID Mattress',
      value: 21800,
      intent: 74,
      signals: [
        ['Missed Call', 'Customer requested callback via website form']
      ]
    },
    {
      id: 'l8',
      name: 'Divya P.',
      phone: '+91 90000 22222',
      score: 68,
      status: 'Medium',
      product: 'Ergonomic Recliner',
      value: 18200,
      intent: 64,
      signals: [
        ['Missed Call', 'Attempted contact yesterday evening']
      ]
    }
  ],

  tasks: [
    ...localTasks,
    // SECTION 1: MISSED CALLS (not yet returned)
    {
      id: 't1',
      leadId: 'l6',
      name: 'Faizan A.',
      phone: '+91 98111 22334',
      type: 'missed',
      attempts: 1,
      dueDate: todayStr,
      product: 'Ortho GRID Mattress',
      value: 24500,
      note: 'Missed inbound call today at 10:05 AM',
      lastCallAt: 'Today 10:05 AM'
    },
    {
      id: 't2',
      leadId: 'l7',
      name: 'Kavitha R.',
      phone: '+91 90000 11111',
      type: 'missed',
      attempts: 2,
      dueDate: todayStr,
      product: 'Ortho GRID Mattress',
      value: 21800,
      note: 'Missed callback request today at 09:40 AM',
      lastCallAt: 'Today 09:40 AM'
    },
    {
      id: 't3',
      leadId: 'l8',
      name: 'Divya P.',
      phone: '+91 90000 22222',
      type: 'missed',
      attempts: 1,
      dueDate: yesterdayStr,
      product: 'Ergonomic Recliner',
      value: 18200,
      note: 'Missed call yesterday at 05:20 PM',
      lastCallAt: 'Yesterday 05:20 PM'
    },

    // SECTION 2: FOLLOW-UPS (spoken to, next step pending, due date set)
    {
      id: 't4',
      leadId: 'l1',
      name: 'Arjun Mehta',
      phone: '+91 98000 00001',
      type: 'followup',
      attempts: 1,
      dueDate: todayStr,
      product: 'Ortho GRID Mattress',
      value: 120000,
      note: 'Confirm WhatsApp confirmation for 4:30 PM store visit appointment.',
      lastCallAt: 'Today 11:15 AM'
    },
    {
      id: 't5',
      leadId: 'l2',
      name: 'Sneha Iyer',
      phone: '+91 87654 32109',
      type: 'followup',
      attempts: 2,
      dueDate: todayStr,
      product: 'Smart Adjustable Mattress',
      value: 98000,
      note: 'Send official GST quotation & 0% no-cost EMI breakdown.',
      lastCallAt: 'Today 09:30 AM'
    },
    {
      id: 't6',
      leadId: 'l3',
      name: 'Rohit Sharma',
      phone: '+91 76543 21098',
      type: 'followup',
      attempts: 1,
      dueDate: tomorrowStr,
      product: 'Ergonomic Recliner',
      value: 85000,
      note: 'Check with manager regarding 5% competitor price match approval.',
      lastCallAt: 'Yesterday 04:00 PM'
    },

    // SECTION 3: COMPLETED
    {
      id: 't7',
      leadId: 'l4',
      name: 'Priya Nair',
      phone: '+91 65432 10987',
      type: 'completed',
      attempts: 1,
      dueDate: todayStr,
      product: 'Duroflex Pro Comfort',
      value: 64000,
      note: 'Order confirmed and payment link dispatched via SMS.',
      lastCallAt: 'Today 08:42 AM'
    },
    {
      id: 't8',
      leadId: 'l5',
      name: 'Vikram Singh',
      phone: '+91 54321 09876',
      type: 'completed',
      attempts: 1,
      dueDate: yesterdayStr,
      product: 'Premium Pillow Set',
      value: 22000,
      note: 'Customer confirmed satisfaction with purchase advice.',
      lastCallAt: 'Yesterday 02:15 PM'
    }
  ],

  calls: [
    {
      id: 'c1',
      leadName: 'Arjun Mehta',
      phone: '+91 98000 00001',
      type: 'Outgoing',
      outcome: 'spoke_followup',
      timestamp: 'Today 11:15 AM',
      duration: '03:45',
      note: 'Discussed store visit; scheduled for 4:30 PM.',
      transcript: [
        'Agent: Hello Arjun, this is John from On-Ground.ai regarding your enquiry.',
        'Arjun: Yes, I was interested in visiting your store to check the Ortho GRID mattress.',
        'Agent: Great! Can I schedule a visit for today at 4:30 PM?',
        'Arjun: That works for me. Send me the location on WhatsApp.'
      ]
    },
    {
      id: 'c2',
      leadName: 'Sneha Iyer',
      phone: '+91 87654 32109',
      type: 'Outgoing',
      outcome: 'spoke_followup',
      timestamp: 'Today 09:30 AM',
      duration: '05:12',
      note: 'Requested quotation with EMI scheme.',
      transcript: [
        'Agent: Hi Sneha, checking in regarding the Smart Adjustable Mattress.',
        'Sneha: Please email the official quote and EMI options.'
      ]
    },
    {
      id: 'c3',
      leadName: 'Faizan A.',
      phone: '+91 98111 22334',
      type: 'Missed',
      outcome: 'no_answer',
      timestamp: 'Today 10:05 AM',
      duration: '00:00',
      note: 'Inbound call missed during peak shift hours.',
      transcript: []
    }
  ],

  channels: [
    { id: 'ch1', name: 'callcentre-team', description: 'General team discussion & announcements' },
    { id: 'ch2', name: 'cross-sell-agent', description: 'Cross-selling strategies & tips' },
    { id: 'ch3', name: 'sop-agent', description: 'Standard operating procedures' },
    { id: 'ch4', name: 'lead-conversion-agent', description: 'High-intent lead conversion alerts' },
    { id: 'ch5', name: 'customer-discussions', description: 'Customer feedback & special requests' }
  ],

  messages: [
    {
      id: 'm1',
      channelId: 'ch1',
      sender: 'Sunita Rao',
      timestamp: '2:08 PM',
      text: 'STAKEHOLDERS: @John Doe (You), whole call centre shift.',
      isMe: false
    },
    {
      id: 'm2',
      channelId: 'ch1',
      sender: 'Sunita Rao',
      timestamp: '2:09 PM',
      text: 'Greeting-in-first-10s QA score is 71%, below our 85% target. Please stick to the script.',
      isMe: false
    },
    {
      id: 'm3',
      channelId: 'ch1',
      sender: 'John Doe',
      timestamp: '2:12 PM',
      text: 'Understood, Sunita. Updated team script checklist for all active calls.',
      isMe: true
    }
  ]
};
