import React from 'react';
import { sceneFlowChat, sceneFlowGenerate } from '../api/studio.js';
import { Icon } from '../components/core/Icon.jsx';
import { saveToLibrary } from '../lib/library.js';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - var(--topbar-h, 56px) - 64px)',
    minHeight: 500,
    background: 'var(--surface-card)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-inset)',
    flexShrink: 0,
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', font: '600 14px/1 var(--font-ui)',
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  headerTitle: { font: '600 15px/1 var(--font-ui)', color: 'var(--text-body)', margin: 0 },
  headerSub: { font: '400 12px/1 var(--font-ui)', color: 'var(--text-muted)', marginTop: 3 },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  // Welcome state
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
    textAlign: 'center',
  },
  welcomeOrb: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'var(--grad-coral)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', font: '700 28px/1 var(--font-ui)',
    boxShadow: 'var(--shadow-coral)',
    marginBottom: 8,
  },
  welcomeTitle: { font: '600 20px/1.3 var(--font-display)', color: 'var(--text-body)', margin: 0 },
  welcomeSub: { font: '400 14px/1.6 var(--font-ui)', color: 'var(--text-muted)', maxWidth: 380, margin: 0 },
  welcomeHints: {
    display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8,
  },
  hint: {
    padding: '6px 14px', borderRadius: 'var(--radius-pill)',
    background: 'var(--cream-deep)', border: '1px solid var(--border)',
    font: '400 13px/1 var(--font-ui)', color: 'var(--text-muted)',
    cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
  },
  // Chat bubbles
  bubbleRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  bubbleAvatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'var(--accent)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    font: '600 11px/1 var(--font-ui)', flexShrink: 0,
  },
  bubbleAvatarUser: { background: 'var(--cream-deep)', color: 'var(--text-muted)' },
  bubble: {
    maxWidth: '72%',
    padding: '12px 16px',
    borderRadius: '18px 18px 18px 4px',
    background: 'var(--surface-inset)',
    border: '1px solid var(--border)',
    font: '400 14px/1.6 var(--font-ui)',
    color: 'var(--text-body)',
    whiteSpace: 'pre-wrap',
  },
  bubbleUser: {
    borderRadius: '18px 18px 4px 18px',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    color: '#fff',
  },
  bubbleImg: {
    maxWidth: 320, borderRadius: 12,
    border: '1px solid var(--border)',
    display: 'block', marginTop: 8,
  },
  bubbleThinking: {
    display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0',
  },
  dot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--text-muted)',
    animation: 'sf-bounce 1.2s ease-in-out infinite',
  },
  resultCard: {
    borderRadius: 16, overflow: 'hidden',
    border: '1px solid var(--border)',
    background: 'var(--cream)',
    maxWidth: 340,
    marginTop: 8,
  },
  resultCardImg: { width: '100%', display: 'block' },
  resultCardFooter: {
    padding: '10px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    font: '500 12px/1 var(--font-ui)', color: 'var(--text-muted)',
  },
  // Input bar
  inputBar: {
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface-inset)',
    padding: '12px 16px',
    gap: 10,
    flexShrink: 0,
  },
  refPreview: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px',
    background: 'var(--surface-inset)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
  },
  refThumb: { width: 40, height: 40, borderRadius: 8, objectFit: 'cover' },
  refLabel: { flex: 1, font: '400 13px/1 var(--font-ui)', color: 'var(--text-muted)' },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  attachBtn: {
    width: 40, height: 40, borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    background: 'var(--surface-inset)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-muted)',
    transition: 'border-color 0.15s, color 0.15s',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    background: 'var(--surface-inset)',
    font: '400 14px/1.5 var(--font-ui)',
    color: 'var(--text-body)',
    resize: 'none',
    outline: 'none',
    minHeight: 42, maxHeight: 120,
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 'var(--radius-lg)',
    background: 'var(--accent)',
    border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff',
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// Strip SCENE_READY:... from display text
function cleanReply(text) {
  return text.replace(/SCENE_READY:\s*\{.*?\}/gs, '').trim();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ThinkingDots() {
  return (
    <div style={S.bubbleThinking}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ ...S.dot, animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

function Bubble({ role, text, imageB64, imageUrl, isThinking }) {
  const isUser = role === 'user';
  return (
    <div style={{ ...S.bubbleRow, ...(isUser ? S.bubbleRowUser : {}) }}>
      <div style={{ ...S.bubbleAvatar, ...(isUser ? S.bubbleAvatarUser : {}) }}>
        {isUser ? 'You' : 'S'}
      </div>
      <div style={{ ...S.bubble, ...(isUser ? S.bubbleUser : {}) }}>
        {isThinking ? <ThinkingDots /> : cleanReply(text)}
        {(imageB64 || imageUrl) && (
          <div style={S.resultCard}>
            <img
              src={imageB64 ? `data:image/png;base64,${imageB64}` : imageUrl}
              alt="Generated"
              style={S.resultCardImg}
            />
            <div style={S.resultCardFooter}>
              <span>Scene generated</span>
              <a
                href={imageB64 ? `data:image/png;base64,${imageB64}` : imageUrl}
                download="scene.png"
                style={{ color: 'var(--accent)', textDecoration: 'none' }}
              >
                Save ↓
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const HINTS = [
  'Rooftop penthouse at sunset',
  'Luxury hotel bathroom mirror',
  'Vanity GRWM setup',
  'Black car interior editorial',
];

function creatorImage(creator) {
  return creator?.refImages?.[0] || creator?.image || null;
}

// campaignId / initialVision / creator thread the Director's session context
// (pinned campaign, re-run vision, selected creator) into this tab so the
// global banner + creator selector are honest here too — not Guided-only.
export function SceneFlow({ campaignId = null, initialVision = '', creator = null }) {
  const [messages, setMessages] = React.useState([]); // { role, text, imageB64, imageUrl }
  const [history, setHistory]   = React.useState([]); // OpenAI message history
  const [input, setInput]       = React.useState(initialVision || '');
  // Pre-attach the session creator's photo as the reference so "Talk It
  // Through" shoots the same person the rest of Director is about.
  const [refImage, setRefImage] = React.useState(() => {
    const img = creatorImage(creator);
    return img ? { dataUrl: img, name: `${creator.name || 'Creator'} (creator)` } : null;
  });
  const [thinking, setThinking] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [scene, setScene]       = React.useState(null);
  const [sessionStarted, setSessionStarted] = React.useState(false);

  const fileRef   = React.useRef(null);
  const bottomRef = React.useRef(null);
  const textRef   = React.useRef(null);

  // Auto-scroll
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg && !refImage && !sessionStarted) return;
    if (thinking || generating) return;

    const userText = msg || (refImage ? '(Reference image attached)' : '');
    if (userText) {
      setMessages(m => [...m, { role: 'user', text: userText }]);
    }
    if (refImage && !sessionStarted) {
      setMessages(m => [...m, { role: 'user', text: '', imageB64: refImage.dataUrl.split(',')[1] }]);
    }
    setInput('');
    setThinking(true);
    setSessionStarted(true);

    try {
      const result = await sceneFlowChat({
        messagesJson: JSON.stringify(history),
        userMessage: msg,
        refImageB64: refImage?.dataUrl || '',
      });

      const rawReply = result.reply || '';
      const aiReply = rawReply.includes('insufficient_quota') || rawReply.includes('exceeded your current quota')
        ? "⚠️ OpenAI credits are empty — add billing at platform.openai.com to activate me."
        : rawReply;
      const newHistory = result.history || [];
      const sceneData = result.scene && Object.keys(result.scene).length ? result.scene : null;

      setHistory(newHistory);
      setThinking(false);
      setMessages(m => [...m, { role: 'assistant', text: aiReply }]);
      // Reference image was transmitted this turn — clear it so it isn't
      // re-sent (and re-read by the model) on every subsequent message.
      if (refImage) setRefImage(null);

      if (sceneData) {
        setScene(sceneData);
        await runGeneration(sceneData);
      }
    } catch (err) {
      setThinking(false);
      setMessages(m => [...m, { role: 'assistant', text: `⚠️ ${err.message}` }]);
    }
  }

  async function runGeneration(sceneData) {
    setGenerating(true);
    const genMsg = `Generating your ${sceneData.content_type === 'video' ? 'video' : 'image'} now — give me a moment... ✨`;
    setMessages(m => [...m, { role: 'assistant', text: genMsg }]);

    try {
      const result = await sceneFlowGenerate({
        sceneJson: JSON.stringify(sceneData),
        refImageB64: refImage?.dataUrl || '',
      });

      if (result.error) {
        setMessages(m => [...m, { role: 'assistant', text: `⚠️ ${result.error}` }]);
      } else {
        setMessages(m => [...m, {
          role: 'assistant',
          text: 'Your scene is ready. ✨',
          imageB64: result.result_b64 || null,
          imageUrl: result.result_url || null,
        }]);
        // Feed the result into the review pipeline (Library → Media Review)
        if (result.result_b64) {
          saveToLibrary(`data:image/png;base64,${result.result_b64}`, {
            source: 'scene_flow',
            prompt: [sceneData.setting, sceneData.wardrobe, sceneData.location].filter(Boolean).join(' · '),
            campaign: campaignId || undefined,
            character: creator?.id,
          }).catch(() => {});
        }
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: `⚠️ Generation failed: ${err.message}` }]);
    }
    setGenerating(false);
  }

  function reset() {
    setMessages([]);
    setHistory([]);
    setInput('');
    setRefImage(null);
    setScene(null);
    setThinking(false);
    setGenerating(false);
    setSessionStarted(false);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setRefImage({ dataUrl, name: file.name });
    e.target.value = '';
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @keyframes sf-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      <div style={S.root}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headerAvatar}>S</div>
          <div style={S.headerText}>
            <p style={S.headerTitle}>Scene Flow</p>
            <p style={S.headerSub}>AI Scene Director · Upload a reference, answer 4 questions, get your scene</p>
          </div>
          {sessionStarted && (
            <button
              onClick={reset}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border)', background: 'none',
                font: '500 12px/1 var(--font-ui)', color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              New Session
            </button>
          )}
        </div>

        {/* Messages / Welcome */}
        {isEmpty ? (
          <div style={S.welcome}>
            <div style={S.welcomeOrb}>S</div>
            <p style={S.welcomeTitle}>Ready to build your scene.</p>
            <p style={S.welcomeSub}>
              Upload a reference photo, then answer 4 quick questions.
              I'll package everything into a prompt and generate your image or video.
            </p>
            <div style={S.welcomeHints}>
              {HINTS.map(h => (
                <button
                  key={h}
                  style={S.hint}
                  onClick={() => { setInput(h); textRef.current?.focus(); }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={S.messages}>
            {messages.map((m, i) => (
              <Bubble
                key={i}
                role={m.role}
                text={m.text}
                imageB64={m.imageB64}
                imageUrl={m.imageUrl}
              />
            ))}
            {thinking && (
              <div style={S.bubbleRow}>
                <div style={S.bubbleAvatar}>S</div>
                <div style={S.bubble}><ThinkingDots /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input bar */}
        <div style={S.inputBar}>
          {refImage && (
            <div style={S.refPreview}>
              <img src={refImage.dataUrl} alt="ref" style={S.refThumb} />
              <span style={S.refLabel}>{refImage.name}</span>
              <button
                onClick={() => setRefImage(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
              >
                ×
              </button>
            </div>
          )}
          <div style={S.inputRow}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              style={S.attachBtn}
              onClick={() => fileRef.current?.click()}
              title="Attach reference image"
            >
              <Icon name="paperclip" size={16} />
            </button>
            <textarea
              ref={textRef}
              style={S.textarea}
              placeholder={sessionStarted ? 'Type your answer...' : 'Describe the vibe, or upload a reference to start...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={thinking || generating}
            />
            <button
              style={{ ...S.sendBtn, opacity: (thinking || generating || (!input.trim() && !refImage)) ? 0.4 : 1 }}
              onClick={() => send()}
              disabled={thinking || generating}
              title="Send"
            >
              <Icon name="arrow-up" size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
