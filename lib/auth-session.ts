'use client';

const LOCAL_SESSION_KEY = 'workshop-local-session-v1';

type LocalSession = {
  email: string;
  createdAt: string;
};

export function createLocalSession(email: string) {
  if (typeof window === 'undefined') return;

  const session: LocalSession = {
    email,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
}

export function getLocalSessionEmail() {
  if (typeof window === 'undefined') return null;

  try {
    const rawSession = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!rawSession) return null;

    const session = JSON.parse(rawSession) as Partial<LocalSession>;
    return typeof session.email === 'string' && session.email.includes('@') ? session.email : null;
  } catch {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    return null;
  }
}

export function clearLocalSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_SESSION_KEY);
}
