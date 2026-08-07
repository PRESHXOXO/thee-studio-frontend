import React from 'react';
import { sanitizeForOpenAI, sceneFlowChat, sceneFlowGenerate } from '../api/studio.js';
import { Icon } from '../components/core/Icon.jsx';
import { ReferenceImageTray } from '../components/director/ReferenceImageTray.jsx';
import { GenerationProgress } from '../components/feedback/GenerationProgress.jsx';
import { saveToLibrary } from '../lib/library.js';
import { creatorMemoryPrompt, getCreatorMemory } from '../lib/creatorMemory.js';
import { referencePromptBlock } from '../lib/directorReferences.js';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100dvh - var(--topbar-h, 56px) - 64px)',
    minHeight: 460,
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
    minHeight: 0,
    overflowY: 'auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  // Welcome state
  welcome: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '24px 28px',
    textAlign: 'center',
  },
  welcomeOrb: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'var(--grad-coral)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', font: '700 24px/1 var(--font-ui)',
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
  draftBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--peach)',
    background: 'var(--accent-soft)',
  },
  draftText: {
    flex: 1, minWidth: 0,
    font: '400 12px/1.4 var(--font-ui)',
    color: 'var(--text-muted)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  generateBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 12px',
    borderRadius: 'var(--radius-pill)',
    border: 'none', background: 'var(--accent)', color: '#fff',
    font: '600 12px/1 var(--font-ui)',
    cursor: 'pointer', flexShrink: 0,
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
  outputRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  outputLabel: {
    font: '600 11px/1 var(--font-ui)', letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
  },
  outputGroup: {
    display: 'inline-flex', gap: 4, padding: 3,
    borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)',
    background: 'var(--surface-card)',
  },
  outputButton: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 11px', borderRadius: 'var(--radius-pill)',
    border: 'none', background: 'transparent',
    color: 'var(--text-muted)', font: '600 12px/1 var(--font-ui)',
    cursor: 'pointer', transition: 'all var(--t-fast)',
  },
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

// Strip SCENE_READY:... from display text
function cleanReply(text) {
  return text
    .replace(/(?:SCENE_DRAFT|GENERATE_SCENE|SCENE_READY):[\s\S]*$/, '')
    .trim();
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

function Bubble({ role, text, imageB64, imageUrl, contentType = 'photo', isThinking }) {
  const isUser = role === 'user';
  const mediaSrc = imageB64 ? `data:image/png;base64,${imageB64}` : imageUrl;
  const isVideo = contentType === 'video';
  return (
    <div style={{ ...S.bubbleRow, ...(isUser ? S.bubbleRowUser : {}) }}>
      <div style={{ ...S.bubbleAvatar, ...(isUser ? S.bubbleAvatarUser : {}) }}>
        {isUser ? 'You' : 'S'}
      </div>
      <div style={{ ...S.bubble, ...(isUser ? S.bubbleUser : {}) }}>
        {isThinking ? <ThinkingDots /> : cleanReply(text)}
        {mediaSrc && (
          <div style={S.resultCard}>
            {isVideo ? (
              <video src={mediaSrc} controls playsInline style={S.resultCardImg}>
                Your browser does not support video playback.
              </video>
            ) : (
              <img src={mediaSrc} alt="Generated" style={S.resultCardImg} />
            )}
            <div style={S.resultCardFooter}>
              <span>{isVideo ? 'Video generated' : 'Scene generated'}</span>
              <a
                href={mediaSrc}
                download={isVideo ? 'scene.mp4' : 'scene.png'}
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
  'Help me brainstorm a scene',
  'Make this feel more candid',
  'Build a luxury campaign concept',
  'What would you improve?',
];

function creatorImage(creator) {
  return creator?.refImages?.[0] || creator?.image || null;
}

function creatorReferences(creator) {
  const img = creatorImage(creator);
  return img ? [{
    id: `creator-${creator.id}`,
    dataUrl: img,
    name: `${creator.name || 'Creator'} (creator)`,
    role: 'identity',
    pending: true,
    source: 'creator',
  }] : [];
}

function isContentPolicyError(value) {
  const text = typeof value === 'string'
    ? value
    : value?.message || value?.error || value?.status || JSON.stringify(value || {});
  return /content policy|safety system|safety filter|moderation|blocked.*policy|policy.*blocked|image generation blocked/i.test(text);
}

function sanitizeSceneForPolicyRetry(sceneData) {
  const rawText = JSON.stringify(sceneData || {});
  // Retry false positives only. Never rewrite age-sensitive or clearly
  // explicit requests into different content to get around moderation.
  const retrySafetyText = rawText
    .replace(/\b(no|not|without)\s+(nudity|sexual content|explicit content)\b/gi, '')
    .replace(/\bnon[- ]sexual(?:ized)?\b/gi, '');
  if (/\b(child|kid|minor|teen(?:ager)?|underage|schoolgirl|schoolboy|nude|nudity|erotic|porn(?:ographic)?|genitals?|sexual act|graphic violence)\b/i.test(retrySafetyText)) {
    return null;
  }

  const sanitizeValue = value => {
    if (typeof value === 'string') return sanitizeForOpenAI(value);
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeValue(child)]));
    }
    return value;
  };

  const sanitized = sanitizeValue(sceneData);
  const prompt = sanitized.full_prompt
    || [sanitized.setting, sanitized.wardrobe, sanitized.location, sanitized.vibe].filter(Boolean).join('. ');
  sanitized.full_prompt = sanitizeForOpenAI(
    `All depicted people are adults age 25 or older. Family-safe, fully clothed editorial lifestyle photography. ${prompt}`
  );
  return sanitized;
}

function buildLivedInScenePrompt(sceneData, outputType, hasIdentityReference) {
  const originalPrompt = sceneData.full_prompt
    || [sceneData.setting, sceneData.wardrobe, sceneData.location, sceneData.vibe].filter(Boolean).join('. ');
  const sceneText = [
    originalPrompt,
    sceneData.setting,
    sceneData.location,
    sceneData.vibe,
  ].filter(Boolean).join(' ').toLowerCase();

  const promptSections = [
    originalPrompt,
    [
      'ENVIRONMENTAL INTEGRATION:',
      'Render the subject and location together as one coherent exposure captured by the same camera at the same moment.',
      'Match lens perspective, subject scale, horizon, white balance, exposure, grain, focus falloff, and depth of field across subject and environment.',
      'Environmental light must wrap onto skin, hair, and clothing with believable color spill; key-light direction, shadow density, highlights, and reflections must agree with the location lighting.',
      'Do not independently beauty-light or over-sharpen the face. Avoid cutout edges, halos, mismatched texture, mismatched grain, or subject sharpness that makes the person look composited into the scene.',
      'Use natural contact shadows wherever hands, clothing, or the subject meet nearby surfaces, plus subtle foreground overlap or occlusion to create real spatial depth.',
    ].join(' '),
    [
      'LIVED-IN MOMENT:',
      'Place the subject mid-action and physically engaged with the location instead of presenting a centered studio pose.',
      'Give the environment signs of immediate use and a clear relationship to what the subject is doing.',
      'Show believable body weight: pelvis, shoulders, elbows, feet, clothing, and nearby cushions or surfaces must respond naturally to gravity and contact.',
      'Every hand and arm needs a motivated action or visible support; no floating, disconnected, or decorative limbs.',
      'Keep posture, gaze, hand placement, and timing observational and naturally imperfect, like a candid documentary moment already happening in this space.',
    ].join(' '),
    [
      'CAMERA AND COMPOSITION:',
      'Use a plausible human camera position and an intentional editorial crop.',
      'Favor natural asymmetry and environmental context, but avoid accidental dead space, excessive empty ceiling, default centered posing, awkward joint crops, or framing that weakens the subject.',
    ].join(' '),
  ];

  if (hasIdentityReference) {
    promptSections.push([
      'IDENTITY REFERENCE USAGE:',
      'Use the uploaded image as the master identity anchor.',
      'Preserve exact fixed facial geometry: face shape, bone structure, eye shape and spacing, brow placement, nose width and profile, lip shape and proportions, jawline, skin tone, age, and distinctive marks.',
      'Hair, glasses, wardrobe, expression, and pose are styling—not permission to recast the face. Change styling only when the scene requests it.',
      'Re-render the person inside this scene from the scene camera viewpoint.',
      'Create new pose, crop, expression, lighting, wardrobe behavior, and perspective appropriate to the location; do not inherit the reference image composition or studio lighting.',
      'The result must remain immediately recognizable as the same person, not a similar-looking model or generic influencer face.',
    ].join(' '));
  }

  if (/\b(mirror|vanity|bathroom|dressing room|grwm|selfie)\b/.test(sceneText)) {
    promptSections.push([
      'MIRROR AND CAMERA LOGIC:',
      'Construct a physically coherent true mirror reflection from one camera viewpoint.',
      'Phone, hand, gaze, mirror crop, reflected room geometry, and left-right orientation must agree.',
      'Anchor the subject at the vanity with the counter or nearby objects contributing foreground depth, believable reflections, and contact shadows.',
      'Use environmental framing that keeps enough of the room visible to establish place rather than turning the result into a cutout-style beauty close-up.',
    ].join(' '));
  } else if (/\b(car|vehicle|driver|passenger|interior)\b/.test(sceneText)) {
    promptSections.push([
      'VEHICLE INTEGRATION:',
      'Place the camera at a believable passenger viewpoint with deliberate framing and minimal unused ceiling.',
      'Settle the subject into the seat with realistic pelvis and shoulder support, cushion compression, bent joints, clothing folds, and grounded leg placement.',
      'Give each arm a natural rest point or clear action with the phone, seat, armrest, door, or console; never let an arm float out of frame without physical logic.',
      'Door and seat occlusion, window reflections, directional window light, cabin color spill, and contact shadows must make the subject physically occupy the vehicle.',
    ].join(' '));
  } else if (/\b(rooftop|terrace|balcony|outdoor|street)\b/.test(sceneText)) {
    promptSections.push([
      'OUTDOOR INTEGRATION:',
      'Wind, ambient sky color, surface bounce, atmospheric depth, and grounded foot or hand contact must affect subject and location consistently.',
    ].join(' '));
  } else if (/\b(kitchen|restaurant|cafe|table|counter)\b/.test(sceneText)) {
    promptSections.push([
      'ACTIVITY INTEGRATION:',
      'Use believable hand contact with the counter, table, glassware, food, or nearby objects and let foreground items overlap the subject naturally.',
    ].join(' '));
  }

  if (outputType === 'video') {
    promptSections.push(
      'MOTION CONTINUITY: Use one continuous, motivated action with stable identity, consistent lighting, coherent reflections, and persistent spatial relationships throughout the shot.'
    );
  }

  return {
    ...sceneData,
    full_prompt: promptSections.filter(Boolean).join('\n\n'),
  };
}

// campaignId / initialVision / creator thread the Director's session context
// (pinned campaign, re-run vision, selected creator) into this tab so the
// global banner + creator selector are honest here too — not Guided-only.
export function SceneFlow({ campaignId = null, initialVision = '', initialSettings = null, creator = null }) {
  const restored = initialSettings?.workflow === 'talk' ? initialSettings : {};
  const [messages, setMessages] = React.useState([]); // { role, text, imageB64, imageUrl }
  const [history, setHistory]   = React.useState([]); // OpenAI message history
  const [input, setInput]       = React.useState(restored.input || initialVision || '');
  // Pre-attach the session creator as the identity reference, then let the
  // user add independent outfit/background/makeup/hair/pose references.
  const [references, setReferences] = React.useState(() => creatorReferences(creator));
  const [thinking, setThinking] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [scene, setScene]       = React.useState(restored.scene || null);
  const [sessionStarted, setSessionStarted] = React.useState(false);
  const [outputType, setOutputType] = React.useState(restored.outputType || 'photo');

  const bottomRef = React.useRef(null);
  const textRef   = React.useRef(null);
  const creatorIdRef = React.useRef(creator?.id ?? null);

  // A creator switch changes the identity of the entire conversation. Start a
  // clean Scene Flow session with the new creator instead of mixing identities.
  React.useEffect(() => {
    const nextCreatorId = creator?.id ?? null;
    if (creatorIdRef.current === nextCreatorId) return;
    creatorIdRef.current = nextCreatorId;
    setMessages([]);
    setHistory([]);
    setInput(initialVision || '');
    setReferences(creatorReferences(creator));
    setThinking(false);
    setGenerating(false);
    setScene(null);
    setSessionStarted(false);
  }, [creator?.id, creator, initialVision]);

  // Auto-scroll
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, generating]);

  async function send(text) {
    const msg = (text || input).trim();
    const referencesToSend = references.filter(reference => reference.pending);
    if (!msg && !referencesToSend.length) return;
    if (thinking || generating) return;

    const userText = msg || `(${referencesToSend.length} reference image${referencesToSend.length === 1 ? '' : 's'} attached)`;
    const roleSummary = referencesToSend
      .map(reference => reference.role)
      .join(', ');
    const backendMessage = msg || (
      referencesToSend.length
        ? `I attached ${referencesToSend.length} visual reference image${referencesToSend.length === 1 ? '' : 's'} for these roles: ${roleSummary}. Acknowledge how you will use each role, then ask what I want to create.`
        : ''
    );
    // Output format belongs to UI state and is applied at generation time.
    // Sending it as prose made the assistant narrate internal state back to
    // users ("still photo is locked") instead of having a natural conversation.
    const conversationMessage = backendMessage;
    if (userText) {
      setMessages(m => [...m, { role: 'user', text: userText }]);
    }
    if (referencesToSend.length) {
      setMessages(m => [
        ...m,
        ...referencesToSend.map(reference => ({
          role: 'user',
          text: reference.role,
          imageUrl: reference.dataUrl,
        })),
      ]);
    }
    setInput('');
    setThinking(true);
    setSessionStarted(true);

    try {
      const result = await sceneFlowChat({
        messagesJson: JSON.stringify(history),
        userMessage: conversationMessage,
        referenceImages: referencesToSend,
      });

      const rawReply = (result.reply || '').trim();
      const aiReply = rawReply.includes('insufficient_quota') || rawReply.includes('exceeded your current quota')
        ? "⚠️ OpenAI credits are empty — add billing at platform.openai.com to activate me."
        : rawReply || (
          referencesToSend.length
            ? 'References received. What kind of scene would you like to create with them?'
            : 'I missed that. Tell me what kind of scene you want to create.'
        );
      const newHistory = result.history?.length ? result.history : [
        ...history,
        { role: 'user', content: conversationMessage },
        { role: 'assistant', content: aiReply },
      ];
      const sceneData = result.scene && Object.keys(result.scene).length ? result.scene : null;
      const nextScene = sceneData
        ? { ...(scene || {}), ...sceneData, content_type: outputType }
        : null;

      setHistory(newHistory);
      setThinking(false);
      setMessages(m => [...m, { role: 'assistant', text: aiReply }]);
      // Keep every reference for generation, but only send newly attached or
      // re-labeled images back through conversational vision.
      if (referencesToSend.length) {
        const deliveredIds = new Set(referencesToSend.map(reference => reference.id));
        setReferences(current => current.map(reference =>
          deliveredIds.has(reference.id) ? { ...reference, pending: false } : reference
        ));
      }

      if (sceneData) {
        setScene(nextScene);
        // New backend requires explicit intent. Undefined keeps compatibility
        // with an older server during rolling deployment.
        if (result.generate === true || result.generate == null) {
          await runGeneration(nextScene, references);
        }
      }
    } catch (err) {
      setThinking(false);
      setMessages(m => [...m, { role: 'assistant', text: `⚠️ ${err.message}` }]);
    }
  }

  async function runGeneration(sceneData, generationReferences = references) {
    setGenerating(true);
    const hasIdentityReference = generationReferences.some(reference => reference.role === 'identity');
    const requestedScene = buildLivedInScenePrompt(
      { ...sceneData, content_type: outputType },
      outputType,
      hasIdentityReference
    );
    const visualReferenceBlock = referencePromptBlock(generationReferences);
    if (visualReferenceBlock) requestedScene.full_prompt += `\n\n${visualReferenceBlock}`;
    const memory = creator ? getCreatorMemory(creator.id) : null;
    const memoryBlock = creatorMemoryPrompt(memory);
    if (memoryBlock) requestedScene.full_prompt += `\n\n${memoryBlock}`;
    const genMsg = `Generating your ${outputType === 'video' ? 'video' : 'image'} now — give me a moment... ✨`;
    setMessages(m => [...m, { role: 'assistant', text: genMsg }]);

    try {
      const telemetryRequestKey = crypto.randomUUID();
      const generate = data => sceneFlowGenerate({
        sceneJson: JSON.stringify(data),
        referenceImages: generationReferences,
        telemetryRequestKey,
      });
      let generationScene = requestedScene;
      let result;
      let policyRetryAttempted = false;

      try {
        result = await generate(generationScene);
      } catch (err) {
        if (!isContentPolicyError(err)) throw err;
        result = { error: err.message };
      }

      if (isContentPolicyError(result)) {
        const sanitizedScene = sanitizeSceneForPolicyRetry(requestedScene);
        if (sanitizedScene) {
          policyRetryAttempted = true;
          generationScene = sanitizedScene;
          setMessages(m => [...m, {
            role: 'assistant',
            text: 'The provider flagged safe wording. Retrying once with policy-safe phrasing…',
          }]);
          try {
            result = await generate(generationScene);
          } catch (err) {
            if (!isContentPolicyError(err)) throw err;
            result = { error: err.message };
          }
        }
      }

      const generatedAsset = result?.result_b64 || result?.result_url;
      if (result?.error) {
        const errorText = isContentPolicyError(result)
          ? policyRetryAttempted
            ? `The provider still blocked this request after the safe-language retry. The reference image itself may be triggering moderation. Detail: ${result.error}`
            : result.error
          : result.error;
        setMessages(m => [...m, { role: 'assistant', text: `⚠️ ${errorText}` }]);
      } else if (!generatedAsset) {
        throw new Error('The provider finished without returning an image. Please try Generate again.');
      } else {
        setMessages(m => [...m, {
          role: 'assistant',
          text: 'Your scene is ready. ✨',
          imageB64: result.result_b64 || null,
          imageUrl: result.result_url || null,
          contentType: result.content_type || outputType,
        }]);
        // Feed the result into the review pipeline (Library → Media Review)
        if (outputType === 'photo' && generatedAsset) {
          const originalScenePrompt = sceneData.full_prompt
            || [sceneData.setting, sceneData.wardrobe, sceneData.location, sceneData.vibe].filter(Boolean).join(' · ');
          const librarySource = result.result_b64
            ? `data:image/png;base64,${result.result_b64}`
            : result.result_url;
          saveToLibrary(librarySource, {
            source: 'scene_flow',
            prompt: generationScene.full_prompt
              || [generationScene.setting, generationScene.wardrobe, generationScene.location, generationScene.vibe].filter(Boolean).join(' · '),
            campaign: campaignId || undefined,
            character: creator?.id,
            mediaType: 'photo',
            settings: {
              version: 1,
              workflow: 'talk',
              input: originalScenePrompt,
              outputType,
              scene: sceneData,
            },
            memoryVersion: memory?.version,
          }).catch(() => {});
        }
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: `⚠️ Generation failed: ${err.message}` }]);
    } finally {
      setGenerating(false);
    }
  }

  function reset() {
    setMessages([]);
    setHistory([]);
    setInput(initialVision || '');
    setReferences(creatorReferences(creator));
    setScene(null);
    setThinking(false);
    setGenerating(false);
    setSessionStarted(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;
  const canSend = !!input.trim() || references.some(reference => reference.pending);
  const hasGeneratedAsset = messages.some(message =>
    message.role === 'assistant' && (message.imageB64 || message.imageUrl)
  );
  const sceneSummary = scene
    ? [scene.setting, scene.wardrobe, scene.location, scene.vibe].filter(Boolean).join(' · ')
    : '';

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
            <p style={S.headerSub}>Your conversational creative director</p>
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
              New chat
            </button>
          )}
        </div>

        {/* Messages / Welcome */}
        {isEmpty ? (
          <div style={S.welcome}>
            <div style={S.welcomeOrb}>S</div>
            <p style={S.welcomeTitle}>What are we creating?</p>
            <p style={S.welcomeSub}>
              Talk through a rough idea, ask for creative direction, attach a reference,
              or refine a scene for as many turns as you need.
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
                contentType={m.contentType}
              />
            ))}
            {thinking && (
              <div style={S.bubbleRow}>
                <div style={S.bubbleAvatar}>S</div>
                <div style={S.bubble}><ThinkingDots /></div>
              </div>
            )}
            <GenerationProgress
              active={generating}
              identityLocked={references.some(reference => reference.role === 'identity')}
              engine={outputType === 'video' ? 'Higgsfield' : 'OpenAI'}
              mode={outputType === 'video' ? 'video' : 'scene'}
              style={{ width: 'min(520px, calc(100% - 38px))', marginLeft: 38 }}
            />
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input bar */}
        <div style={S.inputBar}>
          {scene && (
            <div style={S.draftBar}>
              <Icon name="sparkles" size={15} />
              <div style={S.draftText} title={sceneSummary}>
                <strong style={{ color: 'var(--text-strong)' }}>Scene draft</strong>
                {sceneSummary ? ` · ${sceneSummary}` : ' · Ready to refine'}
              </div>
              <button
                type="button"
                style={{
                  ...S.generateBtn,
                  opacity: generating ? 0.6 : 1,
                  cursor: generating ? 'wait' : 'pointer',
                }}
                onClick={() => runGeneration(scene, references)}
                disabled={thinking || generating}
              >
                <Icon name={outputType === 'video' ? 'video' : 'image'} size={13} />
                {generating
                  ? 'Generating…'
                  : `${hasGeneratedAsset ? 'Regenerate' : 'Generate'} ${outputType === 'video' ? 'video' : 'photo'}`}
              </button>
            </div>
          )}
          <ReferenceImageTray
            references={references}
            onChange={setReferences}
            maxReferences={4}
            defaultRole={creator ? 'outfit' : 'identity'}
            disabled={thinking || generating}
            compact
            title="Scene references"
            description="Give each image one job. Scene Flow keeps identity separate from outfit, background, makeup, hair, and pose."
          />
          <div style={S.outputRow}>
            <span style={S.outputLabel}>Output format</span>
            <div role="radiogroup" aria-label="Scene output format" style={S.outputGroup}>
              {[
                { id: 'photo', label: 'Photo', icon: 'image' },
                { id: 'video', label: 'Video', icon: 'video' },
              ].map(option => {
                const active = outputType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={thinking || generating}
                    onClick={() => setOutputType(option.id)}
                    style={{
                      ...S.outputButton,
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-muted)',
                      cursor: thinking || generating ? 'not-allowed' : 'pointer',
                      opacity: thinking || generating ? 0.6 : 1,
                    }}
                  >
                    <Icon name={option.icon} size={13} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={S.inputRow}>
            <textarea
              ref={textRef}
              style={S.textarea}
              placeholder="Message Scene Flow — Describe the vibe, ask anything, or refine the scene…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={thinking || generating}
            />
            <button
              style={{ ...S.sendBtn, opacity: (thinking || generating || !canSend) ? 0.4 : 1 }}
              onClick={() => send()}
              disabled={thinking || generating || !canSend}
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
