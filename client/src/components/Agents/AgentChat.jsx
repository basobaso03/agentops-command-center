import { useEffect, useMemo, useRef, useState } from 'react';
import { X, SendHorizonal } from 'lucide-react';
import { sendChatMessage } from '../../utils/api';
import MarkdownContent from '../Common/MarkdownContent';

function formatMessage(message) {
  return {
    role: message.role,
    content: message.content,
    functionCalls: message.functionCalls || [],
    handoff: message.handoff || null
  };
}

export default function AgentChat({ agent, onClose, onSwitchAgent }) {
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isSending]);

  const agentLabel = useMemo(() => `${agent.name} · ${agent.department}`, [agent.name, agent.department]);

  async function handleSend(event) {
    event.preventDefault();

    const message = draft.trim();
    if (!message || isSending) {
      return;
    }

    setDraft('');
    setError('');

    const nextHistory = [...history, { role: 'user', content: message }];
    setHistory(nextHistory);
    setIsSending(true);

    try {
      const response = await sendChatMessage(agent.id, message, nextHistory);
      setHistory((currentHistory) => [
        ...currentHistory,
        formatMessage({
          role: 'assistant',
          content: response.response,
          functionCalls: response.functionCalls,
          handoff: response.handoff
        })
      ]);
    } catch (chatError) {
      setError('The chat is temporarily unavailable. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <aside className="chat-panel card">
      <div className="chat-panel__header">
        <div>
          <p className="badge">Chat with Agent</p>
          <h3>{agentLabel}</h3>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      <div className="chat-panel__messages">
        {history.length === 0 ? <p className="empty-state">Start a conversation with this agent.</p> : null}

        {history.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-message chat-message--${message.role}`}>
            {message.functionCalls?.length ? (
              <div className="tool-badge-row">
                {message.functionCalls.map((call) => (
                  <span key={`${call.name}-${index}`} className="tool-badge">
                    🔧 Agent used tool: {call.name}
                  </span>
                ))}
              </div>
            ) : null}

            {message.handoff ? (
              <div className="handoff-card">
                <strong>🔀 Handing off to {message.handoff.target_agent}</strong>
                <p>{message.handoff.reason}</p>
                {onSwitchAgent ? (
                  <button type="button" className="btn btn--secondary" onClick={() => onSwitchAgent(message.handoff.target_agent)}>
                    Switch agent
                  </button>
                ) : null}
              </div>
            ) : null}

            <MarkdownContent
              content={message.content}
              className={`chat-message__bubble markdown-content chat-message__bubble--${message.role}`}
            />
          </div>
        ))}

        {isSending ? (
          <div className="chat-message chat-message--assistant">
            <div className="typing-indicator" aria-label="Typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {error ? <div className="chat-error card">{error}</div> : null}

      <form className="chat-panel__input-row" onSubmit={handleSend}>
        <input
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask this agent anything..."
        />
        <button type="submit" className="btn" disabled={isSending}>
          <SendHorizonal size={16} />
          Send
        </button>
      </form>
    </aside>
  );
}