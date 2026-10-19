import { useState } from 'react';
import { useChannels, useMessages } from '../../data/hooks.js';
import { db } from '../../data/db.js';

export function PulseView() {
  const channels = useChannels();
  const [activeChannelId, setActiveChannelId] = useState('ch1');
  const [inputText, setInputText] = useState('');
  const [hasAnsweredInput, setHasAnsweredInput] = useState(false);

  const messages = useMessages(activeChannelId);
  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    db.addMessage(activeChannelId, inputText.trim(), true);
    setInputText('');
  };

  const handleInputAnswer = (ansText) => {
    setHasAnsweredInput(true);
    db.addMessage(activeChannelId, `Action taken: ${ansText}`, true);
  };

  return (
    <div className="pulse-container glass-card">
      <div className="pulse-sidebar">
        <div className="pulse-bot-banner">
          <h4>🤖 AvaniBot Assistant</h4>
          <p>Real-time channel insights, team alerts & QA feedback.</p>
        </div>

        <div className="channels-list">
          <h5>Pulse Channels</h5>
          {channels.map((ch) => (
            <button
              key={ch.id}
              className={`channel-item ${activeChannelId === ch.id ? 'active' : ''}`}
              onClick={() => setActiveChannelId(ch.id)}
              aria-label={`Select channel ${ch.name}`}
            >
              <span className="hashtag">#</span> {ch.name}
            </button>
          ))}
        </div>
      </div>

      <div className="pulse-chat-area">
        <div className="chat-header">
          <h3>#{activeChannel?.name}</h3>
          <span className="chat-desc">{activeChannel?.description}</span>
        </div>

        {!hasAnsweredInput && (
          <div className="needs-input-banner">
            <div className="banner-title">
              ⚠️ <b>Action Required:</b> Confirm 4:30 PM store visit callback for Arjun Mehta
            </div>
            <div className="banner-actions">
              <button
                className="btn btn-green btn-sm"
                onClick={() => handleInputAnswer('Confirmed 4:30 PM Callback')}
                aria-label="Confirm 4:30 PM callback"
              >
                Confirm Appointment
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleInputAnswer('Rescheduled Callback')}
                aria-label="Reschedule callback"
              >
                Reschedule
              </button>
            </div>
          </div>
        )}

        <div className="messages-feed">
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.isMe ? 'mine' : 'other'}`}>
              <div className="bubble-meta">
                <b>{m.sender}</b> <span className="bubble-time">{m.timestamp}</span>
              </div>
              <div className="bubble-text">{m.text}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="chat-input-form">
          <input
            type="text"
            placeholder={`Message #${activeChannel?.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            aria-label={`Message #${activeChannel?.name}`}
          />
          <button
            type="submit"
            className="btn btn-primary"
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
