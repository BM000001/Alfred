const ALLOWED_ROLES = new Set(['user', 'assistant']);
const ALLOWED_CLASSES = new Set(['public', 'personal', 'academic']);
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_TOTAL_CHARS = 20_000;

export function validateChatMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;
  let total = 0;
  const normalized = [];
  for (const message of messages) {
    if (!message || !ALLOWED_ROLES.has(message.role) || typeof message.content !== 'string') return null;
    const content = message.content.trim();
    if (!content || content.length > MAX_MESSAGE_CHARS) return null;
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return null;
    normalized.push({ role: message.role, content });
  }
  return normalized.at(-1)?.role === 'user' ? normalized : null;
}

export function validateChatConsent(consent) {
  if (!consent || consent.confirmed !== true || consent.reviewedSensitive !== true) return false;
  if (!Array.isArray(consent.classes) || consent.classes.length === 0) return false;
  return consent.classes.every((value) => ALLOWED_CLASSES.has(value));
}
