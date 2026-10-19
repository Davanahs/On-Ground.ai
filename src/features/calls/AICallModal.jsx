import { useState, useRef, useEffect } from 'react';
import { db } from '../../data/db.js';

const KEYWORD_RULES = [
  [/emi|finance|budget|price|cost/i, 'We have 0% no-cost EMI options from 6 to 12 months with easy monthly installments.'],
  [/warrant|trial|guarantee/i, 'We offer a 10-year warranty and a 100-night risk-free trial on all Ortho mattresses.'],
  [/visit|store|showroom|try/i, 'Wonderful! Shall I book a store visit appointment for you tomorrow at 4:30 PM?'],
  [/yes|ok|sure|book|confirm/i, 'Great! I have recorded your appointment and will send a confirmation over WhatsApp.'],
  [/no|not now|later|busy/i, 'No problem at all! I will schedule a quick check-in call for next week. Thank you for your time.']
];

export function AICallModal({ lead, onClose, onShowToast }) {
  const [log, setLog] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [secs, setSecs] = useState(0);

  const customerName = lead?.name || 'Customer';
  const customerProduct = lead?.product || 'Ortho GRID Mattress';

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const transcriptRef = useRef([]);
  const recognitionRef = useRef(null);

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
          product: customerProduct
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
    if (!SpeechRecognition) {
      return;
    }

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
      recognition.onerror = () => {
        // Silently fallback to typing on mic error or timeout
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

    const intro = `Hello ${customerName.split(' ')[0]}, this is Avani from On-Ground AI. Is this a good time to talk about your enquiry for the ${customerProduct}?`;
    speak(intro);
  };

  const endAICall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const durationSecs = secs;
    const durFormatted =
      String(Math.floor(durationSecs / 60)).padStart(2, '0') +
      ':' +
      String(durationSecs % 60).padStart(2, '0');

    if (transcriptRef.current.length > 0) {
      db.addCall({
        leadName: customerName,
        phone: lead?.phone || '+91 99999 00000',
        type: 'AI Call',
        outcome: 'ai_completed',
        duration: durFormatted,
        note: `AI Call with Avani via Groq (${customerProduct})`,
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
    <div className="modal-overlay" onClick={endAICall}>
      <div className="modal-content glass-card ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="ai-title-row">
            <h3>🤖 AI Call Session</h3>
            {isLive && <span className="call-timer-badge">● {formatSecs(secs)}</span>}
          </div>
          <button
            className="btn btn-secondary btn-icon"
            onClick={endAICall}
            aria-label="Close AI call session"
          >
            ✕
          </button>
        </div>

        <p className="ai-subtext">
          Calling Lead: <b>{customerName}</b> ({customerProduct})
        </p>
        <div className="simulation-tag">
          ⚡ Powered by Groq AI &middot; Voice Speech Synthesis &middot; Voice/Text Input
        </div>

        <div className="ai-log-box">
          {log.length === 0 ? (
            <div className="ai-log-empty">
              Click "Start AI Call" to connect with Avani (Sales Assistant powered by Groq).
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
              aria-label="Start AI call"
            >
              ▶ Start AI Call
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
                placeholder="Speak into microphone or type response here..."
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
    </div>
  );
}
