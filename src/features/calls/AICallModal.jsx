import { useState, useRef, useEffect } from 'react';
import { db } from '../../data/db.js';
import { formatE164, validateE164 } from '../../utils/phone.js';

const KEYWORD_RULES = [
  [/emi|finance|budget|price|cost/i, 'We have 0% no-cost EMI options from 6 to 12 months with easy monthly installments.'],
  [/warrant|trial|guarantee/i, 'We offer a 10-year warranty and a 100-night risk-free trial on all Ortho mattresses.'],
  [/visit|store|showroom|try/i, 'Wonderful! Shall I book a store visit appointment for you tomorrow at 4:30 PM?'],
  [/yes|ok|sure|book|confirm/i, 'Great! I have recorded your appointment and will send a confirmation over WhatsApp.'],
  [/no|not now|later|busy/i, 'No problem at all! I will schedule a quick check-in call for next week. Thank you for your time.']
];

export function AICallModal({ lead, onClose, onShowToast }) {
  // Mode: 'cellular' (real outbound phone call to customer's mobile) vs 'browser' (web audio test)
  const [activeTab, setActiveTab] = useState('cellular');

  // Customer & context details
  const customerName = lead?.name || 'Customer';
  const customerPhone = formatE164(lead?.phone || '');
  const customerProduct = lead?.product || 'Ortho GRID Mattress';
  const initialPurpose = lead?.note || `Inquired about ${customerProduct}; check interest in 0% EMI and book store visit`;

  const [purpose, setPurpose] = useState(initialPurpose);

  // Cellular Telephony state
  const [telephonyStatus, setTelephonyStatus] = useState(null); // { type: 'idle'|'loading'|'active'|'error', msg, sid }
  const [isDialing, setIsDialing] = useState(false);

  // In-Browser Audio AI state
  const [log, setLog] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [secs, setSecs] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const transcriptRef = useRef([]);
  const recognitionRef = useRef(null);

  // --- CELLULAR TELEPHONY ACTIONS (REAL PHONE CALL TO CUSTOMER) ---
  const handleDialCustomerPhone = async () => {
    if (!validateE164(customerPhone)) {
      setTelephonyStatus({
        type: 'error',
        msg: `Invalid customer phone format (${customerPhone || 'empty'}). Please use E.164 format (e.g. +91 98765 43210).`
      });
      return;
    }

    setIsDialing(true);
    setTelephonyStatus({
      type: 'loading',
      msg: `Connecting to Cloud Telephony... Dialing ${customerName}'s phone (${customerPhone})...`
    });

    try {
      const res = await fetch('/api/ai-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerPhone,
          name: customerName,
          purpose: purpose.trim(),
          product: customerProduct
        })
      });

      const isJson = (res.headers.get('content-type') || '').includes('json');
      const data = isJson ? await res.json().catch(() => ({})) : {};

      if (!res.ok || !data.sid) {
        setTelephonyStatus({
          type: 'error',
          msg: data.error || 'Cloud Telephony carrier is not connected on this server/Netlify deployment. Real cellular phone dialing requires Twilio credentials (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM).'
        });
      } else {
        const sid = data.sid || 'SID-' + Date.now();
        setTelephonyStatus({
          type: 'active',
          sid,
          msg: `📞 Outbound AI Call Initiated! ${customerName}'s phone (${customerPhone}) is ringing. When answered, AI Avani will speak to ${customerName} regarding "${purpose.trim()}".`
        });

        // Save real call record in db
        db.addCall({
          leadName: customerName,
          phone: customerPhone,
          type: 'AI Phone Call (PSTN)',
          outcome: 'ai_dialed',
          duration: '01:15',
          note: `Real outbound AI call placed to ${customerName} (${customerPhone}). Purpose: "${purpose.trim()}". Twilio Call SID: ${sid}`
        });

        if (onShowToast) onShowToast(`AI Call placed to ${customerName}'s mobile!`);
      }
    } catch (err) {
      setTelephonyStatus({
        type: 'error',
        msg: 'Cloud Telephony carrier is not connected on this server/Netlify deployment. Real cellular phone dialing requires Twilio credentials (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM).'
      });
    } finally {
      setIsDialing(false);
    }
  };


  // --- IN-BROWSER AUDIO ACTIONS (SIMULATION / VOICE TEST) ---
  const appendLog = (speaker, text) => {
    const formatted = `${speaker}: ${text}`;
    transcriptRef.current.push(formatted);
    setLog((prev) => [...prev, { speaker, text }]);
  };

  const speak = (text) => {
    appendLog('Agent (AI)', text);
    if (!('speechSynthesis' in window)) {
      listen();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.onend = () => {
      listen();
    };
    window.speechSynthesis.speak(utterance);
  };

  const processCustomerInput = async (input) => {
    if (!input || !input.trim()) return;
    const cleanInput = input.trim();
    appendLog('Customer', cleanInput);
    setIsThinking(true);

    let reply = '';

    // First attempt: Call Groq AI through /api/ai-chat
    try {
      const history = transcriptRef.current.map((line) => {
        const isAgent = line.startsWith('Agent');
        return {
          role: isAgent ? 'assistant' : 'user',
          content: line.replace(/^(Agent \(AI\)|Customer):\s*/, '')
        };
      });

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          customerName,
          product: customerProduct,
          purpose: purpose.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          reply = data.reply;
        }
      }
    } catch (err) {
      console.warn('Groq AI endpoint fallback:', err);
    }

    // Fallback: rule-based responses if Groq is unavailable
    if (!reply) {
      const match = KEYWORD_RULES.find(([regex]) => regex.test(cleanInput));
      reply = match
        ? match[1]
        : 'Understood. Could you tell me a bit more about your preference or requirement?';
    }

    setIsThinking(false);
    speak(reply);
  };

  const listen = () => {
    if (!isLive) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        processCustomerInput(transcript);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      // Ignore start errors
    }
  };

  const startAICall = () => {
    setIsLive(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setSecs(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    const intro = `Hello ${customerName.split(' ')[0]}, this is Avani from On-Ground AI. I am calling regarding ${purpose.trim() || customerProduct}. Is this a good time to speak?`;
    speak(intro);
  };

  const endAICall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const durationSecs = secs;
    const durFormatted =
      String(Math.floor(durationSecs / 60)).padStart(2, '0') +
      ':' +
      String(durationSecs % 60).padStart(2, '0');

    if (transcriptRef.current.length > 0) {
      db.addCall({
        leadName: customerName,
        phone: customerPhone || '+91 99999 00000',
        type: 'AI Browser Call',
        outcome: 'ai_completed',
        duration: durFormatted,
        note: `AI Voice Call with Avani via Groq (${customerProduct}). Purpose: ${purpose.trim()}`,
        transcript: transcriptRef.current
      });

      if (onShowToast) onShowToast('AI Call session saved to Recent Calls!');
    }

    setIsLive(false);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const formatSecs = (s) =>
    String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  return (
    <div className="modal-overlay" onClick={isLive ? endAICall : onClose}>
      <div className="modal-content glass-card ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="ai-title-row">
            <h3>🤖 AI Call Studio: {customerName}</h3>
            {isLive && <span className="call-timer-badge">● {formatSecs(secs)}</span>}
          </div>
          <button
            className="btn btn-secondary btn-icon"
            onClick={isLive ? endAICall : onClose}
            aria-label="Close AI call session"
          >
            ✕
          </button>
        </div>

        {/* MODE TABS */}
        <div className="ai-modal-tabs">
          <button
            type="button"
            className={`ai-tab-btn ${activeTab === 'cellular' ? 'active' : ''}`}
            onClick={() => setActiveTab('cellular')}
          >
            📞 Dial Customer Phone (Twilio PSTN)
          </button>
          <button
            type="button"
            className={`ai-tab-btn ${activeTab === 'browser' ? 'active' : ''}`}
            onClick={() => setActiveTab('browser')}
          >
            🎙️ Web Voice Test (Browser AI)
          </button>
        </div>

        {/* TAB 1: REAL OUTBOUND PHONE CALL TO CUSTOMER'S MOBILE */}
        {activeTab === 'cellular' && (
          <div className="telephony-pane">
            <div className="telephony-info-box">
              <b>How Real AI Phone Calling Works:</b> Clicking the button below instructs our Cloud Telephony gateway to place a real outbound cellular call to <b>{customerName}</b> at <b>{customerPhone || '(enter phone)'}</b>. When {customerName} answers, <b>AI Avani</b> speaks into the call, asks qualifying questions based on your stated purpose, listens to replies, and logs the full call record.
            </div>

            <div className="telephony-field">
              <label>Customer Destination Phone</label>
              <input
                type="text"
                className="telephony-input"
                value={customerPhone}
                readOnly
                aria-label="Target phone number"
              />
            </div>

            <div className="telephony-field">
              <label>Call Purpose / Topic for Avani</label>
              <input
                type="text"
                className="telephony-input"
                placeholder="e.g. Inquired about Ortho GRID mattress; wants 0% EMI info"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                aria-label="Call purpose or topic"
              />
            </div>

            {telephonyStatus && (
              <div className={`telephony-status-alert ${telephonyStatus.type}`}>
                <p><strong>{telephonyStatus.type === 'error' ? '⚠️ Notice' : '📞 Call Status'}:</strong> {telephonyStatus.msg}</p>
                {telephonyStatus.type === 'error' && (
                  <div style={{ marginTop: '10px', fontSize: '11px', opacity: 0.95 }}>
                    <p style={{ marginBottom: '6px', color: '#cbd5e1' }}>
                      💡 <b>Test right now:</b> You can speak with Avani immediately on your phone using your device microphone & speaker!
                    </p>
                    <button
                      type="button"
                      className="btn btn-green btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => setActiveTab('browser')}
                    >
                      🎙️ Test Avani Voice in Browser Now
                    </button>
                  </div>
                )}
              </div>
            )}


            <div className="telephony-actions">
              <button
                type="button"
                className="btn btn-green flex-1"
                disabled={isDialing || !customerPhone}
                onClick={handleDialCustomerPhone}
                aria-label="Dial customer phone"
              >
                {isDialing ? '⏳ Dialing Mobile...' : `🚀 Dial ${customerName}'s Phone via AI (+91...)`}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: IN-BROWSER AUDIO / VOICE AI TEST */}
        {activeTab === 'browser' && (
          <div>
            <p className="ai-subtext">
              Lead: <b>{customerName}</b> &middot; Product: <b>{customerProduct}</b>
            </p>
            <div className="simulation-tag">
              ⚡ Powered by Groq AI &middot; Voice Speech Synthesis (en-IN) &middot; Speech Recognition
            </div>

            <div className="ai-log-box">
              {log.length === 0 ? (
                <div className="ai-log-empty">
                  Click "Start AI Web Call" to speak directly with Avani using your device microphone/speaker.
                </div>
              ) : (
                log.map((item, idx) => (
                  <div
                    key={idx}
                    className={`ai-log-line ${item.speaker.startsWith('Agent') ? 'agent' : 'customer'}`}
                  >
                    <b>{item.speaker}:</b> {item.text}
                  </div>
                ))
              )}
              {isThinking && (
                <div className="ai-log-line agent" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                  🤖 Avani is thinking...
                </div>
              )}
            </div>

            {!isLive ? (
              <div className="modal-actions">
                <button
                  className="btn btn-green"
                  onClick={startAICall}
                  aria-label="Start AI web call"
                >
                  ▶ Start AI Web Call
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={onClose}
                  aria-label="Cancel AI call"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="ai-active-controls">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    processCustomerInput(typedText);
                    setTypedText('');
                  }}
                  className="typing-fallback-form"
                >
                  <input
                    type="text"
                    placeholder="Speak into mic or type reply here..."
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    disabled={isThinking}
                    aria-label="Type response"
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    disabled={isThinking || !typedText.trim()}
                    aria-label="Send reply"
                  >
                    Send
                  </button>
                </form>

                <button
                  className="btn btn-red"
                  onClick={endAICall}
                  aria-label="End and save AI call"
                >
                  🔴 End & Save Call
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
