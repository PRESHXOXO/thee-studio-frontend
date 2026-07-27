const ACCOUNTS_KEY = 'ts_test_accounts';
const SESSION_KEY = 'ts_auth_session';
const PBKDF2_ITERATIONS = 120000;

function loadAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure browser encryption is unavailable. Use HTTPS or localhost.');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

function saveSession(account) {
  const session = {
    id: account.id,
    name: account.name,
    email: account.email,
    signedInAt: new Date().toISOString(),
    provider: 'local-test',
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function loadAuthSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return parsed?.id && parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function createTestAccount({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name.trim();
  if (!displayName) throw new Error('Enter your name.');
  if (!normalizedEmail) throw new Error('Enter your email address.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const accounts = loadAccounts();
  if (accounts.some(account => account.email === normalizedEmail)) {
    throw new Error('An account with this email already exists. Sign in instead.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const account = {
    id: crypto.randomUUID?.() || `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: displayName,
    email: normalizedEmail,
    salt: bytesToBase64(salt),
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  return saveSession(account);
}

export async function signInTestAccount({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = loadAccounts().find(candidate => candidate.email === normalizedEmail);
  if (!account) throw new Error('No account found for this email. Create an account first.');

  const candidateHash = await hashPassword(password, base64ToBytes(account.salt));
  if (candidateHash !== account.passwordHash) throw new Error('Incorrect password.');
  return saveSession(account);
}
