import type { FocusSession } from './types';

export function summarizeFocusSessions(sessions: FocusSession[], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const todaySessions = sessions.filter((session) => session.completedAt.slice(0, 10) === today);
  return {
    total: sessions.length,
    today: todaySessions.length,
    todayMinutes: todaySessions.reduce((sum, session) => sum + session.durationMinutes, 0),
    recent: [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 5),
  };
}
