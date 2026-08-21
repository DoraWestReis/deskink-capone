const STORAGE_KEY = 'deskink-birthday-done';

export function loadDoneBirthdays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markBirthdayDone(id) {
  const next = Array.from(new Set([...loadDoneBirthdays(), id])).slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}