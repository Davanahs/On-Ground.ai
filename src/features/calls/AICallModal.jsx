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

export function AICallModal({ lead, onClose, onShowToast, defaultTab = 'cellular' }) {
  // Mode: 'cellular' (Real Twilio carrier outbound call to customer) vs 'browser' (Agent Practice / Demonstration)
  const [activeTab, setActiveTab] = useState(lead?.initialTab || defaultTab);

  // Customer & context details
  const customerName = lead?.name || 'Customer';
  const customerPhone = formatE164(lead?.phone || '');
  const [targetPhone, setTargetPhone] = useState(customerPhone);
  const customerProduct = lead?.product || 'Ortho GRID Mattress';
  const initialPurpose = lead?.note || `Inquired about ${customerProduct}; check interest in 0% EMI and book store visit`;

  const [purpose, setPurpose] = useState(initialPurpose);

  // Cellular Telephony state
  const [telephonyStatus, setTelephonyStatus] = useState(null); // { type: 'idle'|'loading'|'active'|'completed'|'error', msg, sid, duration }
  const [isDialing, setIsDialing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [telephonySecs, setTelephonySecs] = useState(0);
  const telephonySecsRef = useRef(0);
  const telephonyTimerRef = useRef(null);
  const callSavedRef = useRef(false);

  // Finalize and save the real cellular call with full transcript
  const finalizeTelephonyCall = (transcriptTurns = liveTranscript, customDur) => {
    if (callSavedRef.current) return;
    callSavedRef.current = true;

    if (telephonyTimerRef.current) clearInterval(telephonyTimerRef.current);

    const durationSecs = telephonySecsRef.current || 45;
    const durFormatted = customDur || (
      String(Math.floor(durationSecs / 60)).padStart(2, '0') +
      ':' +
      String(durationSecs % 60).padStart(2, '0')
    );

    const formattedTarget = formatE164(targetPhone);
    const transcriptLines = (transcriptTurns || []).map((t) => `${t.speaker}: ${t.text}`);

    const textAll = transcriptLines.join(' ');
    let noteText = `AI Call completed with ${customerName} (${formattedTarget}) regarding ${customerProduct}.`;
    if (/emi|cost|price/i.test(textAll)) noteText += ' Customer inquired about 0% EMI pricing.';
    if (/warrant|trial/i.test(textAll)) noteText += ' Customer inquired about 10-year warranty.';
    if (/whatsapp|catalog|send/i.test(textAll)) noteText += ' Requested brochure on WhatsApp.';

    // Save real completed call in db
    db.addCall({
      leadName: customerName,
      phone: formattedTarget,
      type: 'AI Phone Call (PSTN)',
      outcome: 'ai_completed',
      duration: durFormatted,
      note: noteText,
      transcript: transcriptLines
    });

    setTelephonyStatus({
      type: 'completed',
      duration: durFormatted,
      sid: telephonyStatus?.sid,
      msg: `Call ended successfully. Full transcript and outcomes recorded to Recent Calls!`
    });

    if (onShowToast) onShowToast(`Call ended & saved to Recent Calls!`);
  };

  // Poll live transcript and auto-detect call completion
  useEffect(() => {
    if (!telephonyStatus?.sid || telephonyStatus.type !== 'active') return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/call-transcript?sid=${encodeURIComponent(telephonyStatus.sid)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (Array.isArray(data.turns)) {
              setLiveTranscript(data.turns);
            }
            if (data.completed) {
              clearInterval(interval);
              finalizeTelephonyCall(data.turns, data.duration ? `${data.duration}s` : null);
            }
          }
        }
      } catch (e) {
        // ignore polling error
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [telephonyStatus?.sid, telephonyStatus?.type]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (telephonyTimerRef.current) clearInterval(telephonyTimerRef.current);
    };
  }, []);

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
    const formattedTarget = formatE164(targetPhone);
    if (!validateE164(formattedTarget)) {
      setTelephonyStatus({
        type: 'error',
        msg: `Invalid customer phone format (${targetPhone || 'empty'}). Please use E.164 format (e.g. +91 98765 43210).`
      });
      return;
    }

    setIsDialing(true);
    setTelephonyStatus({
      type: 'loading',
      msg: `Connecting to Twilio Cloud Telephony... Dialing ${customerName}'s phone (${formattedTarget})...`
    });

    try {
      const res = await fetch('/api/ai-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formattedTarget,
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
          msg: data.error || 'Twilio carrier call failed. Check your Twilio credentials (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM) and ALLOWED_NUMBERS in .env.'
        });
      } else {
        const sid = data.sid || 'SID-' + Date.now();
        callSavedRef.current = false;
        telephonySecsRef.current = 0;
        setTelephonySecs(0);
        if (telephonyTimerRef.current) clearInterval(telephonyTimerRef.current);
        telephonyTimerRef.current = setInterval(() => {
          telephonySecsRef.current += 1;
          setTelephonySecs(telephonySecsRef.current);
        }, 1000);

        setTelephonyStatus({
          type: 'active',
          sid,
          msg: `📞 Outbound AI Call Initiated! ${customerName}'s phone (${formattedTarget}) is ringing now. When answered, AI Avani will speak directly to them regarding "${purpose.trim()}".`
        });

        if (onShowToast) onShowToast(`AI Call placed to ${customerName} (${formattedTarget})!`);
      }
    } catch (err) {
      setTelephonyStatus({
        type: 'error',
        msg: err.message || 'Error connecting to /api/ai-call server endpoint.'
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

    // 1. First attempt: Call backend /api/ai-chat
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
        const isJson = (res.headers.get('content-type') || '').includes('json');
        if (isJson) {
          const data = await res.json();
          if (data.reply) reply = data.reply;
        }
      }
    } catch (err) {
      console.warn('Groq AI backend fallback:', err);
    }

    // 2. Direct client-side Groq call (Ensures 100% REAL dynamic AI on static Netlify deployment too!)
    if (!reply) {
      try {
        const clientApiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!clientApiKey) throw new Error('VITE_GROQ_API_KEY not set');
        const contextNote = purpose ? `Call Purpose: "${purpose.trim()}" for ${customerProduct}` : `Inquiry for ${customerProduct}`;

        const systemPrompt = `You are Avani, a professional, warm sales consultant at On-Ground.ai Call Centre in Bengaluru, India.
You are in a live phone call with ${customerName}. Context: ${contextNote}.
Important Guidelines:
- Answer politely in 1-2 spoken sentences strictly under 30 words in natural Indian English.
- Address exactly what ${customerName} asked or said dynamically.
- Mention offers when relevant: 0% no-cost EMI for 6 to 12 months, 10-year warranty, 100-night trial.
- Never use emojis, asterisks, bullet points, or markdown. Output only the spoken words.`;

        const history = transcriptRef.current.map((line) => {
          const isAgent = line.startsWith('Agent');
          return {
            role: isAgent ? 'assistant' : 'user',
            content: line.replace(/^(Agent \(AI\)|Customer):\s*/, '')
          };
        });

        const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.slice(-8)
            ],
            max_tokens: 150,
            temperature: 0.6
          })
        });

        if (gRes.ok) {
          const gData = await gRes.json();
          reply = gData.choices?.[0]?.message?.content?.trim() || '';
        }
      } catch (clientErr) {
        console.warn('Direct Groq API fallback:', clientErr);
      }
    }

    // 3. Last fallback: rule-based responses if completely offline
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
            {telephonyStatus?.type === 'active' && (
              <span className="call-timer-badge" style={{ background: '#10b981', color: '#fff' }}>
                ● {String(Math.floor(telephonySecs / 60)).padStart(2, '0')}:{String(telephonySecs % 60).padStart(2, '0')}
              </span>
            )}
            {telephonyStatus?.type === 'completed' && (
              <span className="call-timer-badge" style={{ background: '#059669', color: '#fff' }}>
                ✓ Completed ({telephonyStatus.duration})
              </span>
            )}
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
            📡 Real AI Phone Call (Twilio to Customer)
          </button>
          <button
            type="button"
            className={`ai-tab-btn ${activeTab === 'browser' ? 'active' : ''}`}
            onClick={() => setActiveTab('browser')}
          >
            🎙️ Browser Audio Test (Demonstration)
          </button>
        </div>


        {/* TAB 1: REAL OUTBOUND PHONE CALL TO CUSTOMER'S MOBILE */}
        {activeTab === 'cellular' && (
          <div className="telephony-pane">
            <div className="telephony-info-box">
              <b>How Real AI Phone Calling Works:</b> Clicking the button below instructs Twilio to place an actual cellular phone call to <b>{customerName}</b> at <b>{targetPhone || '(enter phone)'}</b>. When the human answers their phone, <b>AI Avani</b> speaks directly to them over the call, answers their questions dynamically using Groq, and converses with them naturally.
            </div>

            <div className="telephony-field">
              <label>Customer Destination Phone (E.164 with Country Code)</label>
              <input
                type="text"
                className="telephony-input"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="+919876543210"
                aria-label="Target phone number"
              />
              <small style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                💡 <b>Twilio Trial Tip:</b> Free-tier Twilio accounts can only call Verified Caller IDs. Enter your own verified mobile number here to test receiving the call live.
              </small>
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
                      💡 <b>Browser Test:</b> You can also preview what Avani sounds like right now in your browser without placing a phone call:
                    </p>
                    <button
                      type="button"
                      className="btn btn-green btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => setActiveTab('browser')}
                    >
                      🎙️ Switch to In-Browser Voice Demo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* LIVE CONVERSATION FEED (STREAMED DIRECT FROM ACTIVE TWILIO CALL) */}
            {telephonyStatus?.type === 'active' && (
              <div className="live-call-transcript-container" style={{ marginTop: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#10b981' }}>
                    <span className="live-dot pulse" style={{ color: '#10b981' }}>●</span> Live Phone Stream
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '12px' }}>
                    SID: {telephonyStatus.sid?.slice(0, 12)}...
                  </span>
                </div>

                <div className="ai-log-box" style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.6)' }}>
                  {liveTranscript.length === 0 ? (
                    <div className="ai-log-empty" style={{ fontStyle: 'italic', fontSize: '12px' }}>
                      ⏳ Connecting... As soon as you and Avani speak on the phone, your live conversation will appear here in real time!
                    </div>
                  ) : (
                    liveTranscript.map((turn, idx) => (
                      <div
                        key={idx}
                        className={`ai-log-line ${turn.speaker.includes('Avani') ? 'agent' : 'customer'}`}
                      >
                        <b>{turn.speaker}:</b> {turn.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}


            <div className="telephony-actions">
              {telephonyStatus?.type === 'active' ? (
                <button
                  type="button"
                  className="btn btn-red flex-1"
                  onClick={() => finalizeTelephonyCall(liveTranscript)}
                  aria-label="End call and save record"
                >
                  🔴 End Call & Save Record ({String(Math.floor(telephonySecs / 60)).padStart(2, '0')}:{String(telephonySecs % 60).padStart(2, '0')})
                </button>
              ) : telephonyStatus?.type === 'completed' ? (
                <button
                  type="button"
                  className="btn btn-green flex-1"
                  onClick={onClose}
                  aria-label="Done and view in recent calls"
                >
                  ✓ Done & View in Recent Calls
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-green flex-1"
                    disabled={isDialing || !targetPhone}
                    onClick={handleDialCustomerPhone}
                    aria-label="Dial customer phone"
                  >
                    {isDialing ? '⏳ Dialing Phone...' : `🚀 Call ${customerName} Now (AI Speaks to Human)`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: IN-BROWSER AUDIO / VOICE AI TEST */}
        {activeTab === 'browser' && (
          <div className="telephony-pane">
            <div className="active-call-header-badge">
              <span className={`live-dot ${isLive ? 'pulse' : ''}`}>●</span>{' '}
              {isLive ? (
                <span>Connected: <b>{customerName}</b> ({customerPhone || 'Online'})</span>
              ) : (
                <span>Ready to call: <b>{customerName}</b> ({customerPhone || 'Online'})</span>
              )}
            </div>

            <div className="telephony-field">
              <label>Call Purpose / Talking Points for Avani</label>
              <input
                type="text"
                className="telephony-input"
                placeholder="e.g. Inquired about Ortho GRID mattress; 0% EMI and warranty"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={isLive}
                aria-label="Call purpose or topic"
              />
            </div>

            <div className="simulation-tag">
              ⚡ Powered by Groq AI &middot; Voice Speech Synthesis (en-IN) &middot; Speech Recognition
            </div>

            <div className="ai-log-box">
              {log.length === 0 ? (
                <div className="ai-log-empty">
                  Click "Start Live AI Voice Call" below to speak directly with Avani on your phone's speaker and microphone.
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
                  className="btn btn-green flex-1"
                  onClick={startAICall}
                  aria-label="Start Live AI voice call"
                >
                  ▶ Start Live AI Voice Call
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
