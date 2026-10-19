import { useState, useEffect } from 'react';
import { useSettings } from '../../data/hooks.js';
import { startPending, requestOutcome } from '../../utils/pendingCall.js';
import { formatE164, validateE164 } from '../../utils/phone.js';
import { localDateStr } from '../../utils/date.js';

export function CallActions({ customerPhone, customerName, task, onShowToast, onOpenAIPractice, isCompact = false }) {
  const settings = useSettings();
  const [loadingAction, setLoadingAction] = useState(null); // 'bridge' | null
  const [statusMsg, setStatusMsg] = useState(null);
  const [called, setCalled] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(true);

  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const formattedCustomerPhone = formatE164(customerPhone);
  const formattedAgentPhone = formatE164(settings.agentPhone);
  const callTask = task || {
    id: 'quick_' + Date.now(),
    name: customerName,
    phone: customerPhone,
    product: 'General Enquiry',
    type: 'missed',
    attempts: 1,
    dueDate: localDateStr()
  };

  // Probe serverless API availability
  useEffect(() => {
    let isMounted = true;
    fetch('/api/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((res) => {
        if (isMounted) setIsApiAvailable((res.headers.get('content-type') || '').includes('json'));
      })
      .catch(() => {
        if (isMounted) setIsApiAvailable(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNativeCallClick = () => {
    startPending(callTask);
    setCalled(true);
    if (!isMobileDevice) {
      setStatusMsg('📱 Phone dialler requested. Note: Desktop browsers require a softphone app (e.g. FaceTime/Skype) or mobile device.');
    } else {
      setStatusMsg('📱 Dialler launched. Please log outcome when call finishes.');
    }
  };

  // Action 2: "Call me, then connect" (Twilio Bridge)
  const handleBridgeCall = async () => {
    if (!validateE164(formattedCustomerPhone)) {
      setStatusMsg('❌ Invalid customer E.164 phone format (+91...)');
      return;
    }
    if (!validateE164(formattedAgentPhone)) {
      setStatusMsg('❌ Invalid agent E.164 phone format in settings');
      return;
    }

    setLoadingAction('bridge');
    setStatusMsg('Dialing via Twilio bridge...');

    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPhone: formattedAgentPhone,
          customerPhone: formattedCustomerPhone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(`❌ Call failed: ${data.error || 'Server error'}`);
      } else {
        setStatusMsg(`📞 Call initiated! Twilio Call SID: ${data.sid}`);
        if (onShowToast) onShowToast(`Twilio call started for ${customerName}`);
        setCalled(true);
      }
    } catch (err) {
      setStatusMsg('⚠️ /api/call endpoint unavailable.');
      setIsApiAvailable(false);
    } finally {
      setLoadingAction(null);
    }
  };

  // Action 3: "Start AI call" (Direct AI Voice session powered by Groq)
  const handleAICall = () => {
    if (!validateE164(formattedCustomerPhone)) {
      setStatusMsg('❌ Invalid customer E.164 phone format (+91...)');
      return;
    }

    setStatusMsg('🤖 AI Voice session active with Avani.');
    setCalled(true);

    if (onOpenAIPractice) {
      onOpenAIPractice(callTask);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oncall:open-ai-call', { detail: callTask }));
    }
  };

  return (
    <div className={`call-actions-box ${isCompact ? 'compact' : ''}`}>
      <div className="action-buttons-list">
        {/* Mobile vs Desktop Primary Action */}
        <a
          href={`tel:${formattedCustomerPhone}`}
          className="btn btn-green btn-sm primary-call-btn"
          onClick={handleNativeCallClick}
          aria-label={`Call ${customerName}`}
        >
          {isMobileDevice ? '📱 Call on my phone' : '📱 Call from my phone'}
        </a>

        <div className="action-sub-grid">
          {/* Action: Start AI call */}
          <button
            type="button"
            className="btn btn-secondary btn-sm ai-call-btn"
            onClick={handleAICall}
            aria-label={`Start AI call for ${customerName}`}
            title="Start AI voice call session powered by Groq"
          >
            🤖 Start AI call
          </button>

          {/* Action: Call me, then connect (Twilio Bridge) */}
          {isApiAvailable && (
            <button
              type="button"
              className="btn btn-secondary btn-sm bridge-call-btn"
              disabled={loadingAction !== null}
              onClick={handleBridgeCall}
              aria-label={`Call me then connect to ${customerName}`}
              title={`Ring my phone (${formattedAgentPhone}) then dial ${formattedCustomerPhone}`}
            >
              {loadingAction === 'bridge' ? '⏳ Connecting...' : '🔄 Bridge Call'}
            </button>
          )}
        </div>
      </div>

      {statusMsg && <div className="action-status-inline">{statusMsg}</div>}
      {called && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => requestOutcome(callTask)}
          aria-label="Log call outcome"
        >
          📝 Log call outcome
        </button>
      )}
    </div>
  );
}
