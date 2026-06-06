// Cross-view helpers

import { ymd, daysBetween } from '../utils.js';

export function totalStudyMinutesInRange(sessions, fromYmd, toYmd) {
  let total = 0;
  for (const s of sessions) {
    if (!s.startedAt || !s.durationMinutes) continue;
    const dateStr = ymd(s.startedAt);
    if (dateStr >= fromYmd && dateStr <= toYmd) total += s.durationMinutes;
  }
  return Math.round(total);
}

export function sessionsByDay(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const k = ymd(s.startedAt);
    map.set(k, (map.get(k) || 0) + (s.durationMinutes || 0));
  }
  return map;
}

export function computeStreak(sessions) {
  if (!sessions.length) return 0;
  const byDay = sessionsByDay(sessions);
  let streak = 0;
  // Start from today; if no study today but studied yesterday, we still count yesterday's streak (forgiving)
  const todayStr = ymd(new Date());
  const yesterdayStr = ymd(new Date(Date.now() - 86400000));
  let cursor = new Date();
  if (!byDay.has(todayStr)) {
    if (byDay.has(yesterdayStr)) cursor.setDate(cursor.getDate() - 1);
    else return 0;
  }
  while (true) {
    const k = ymd(cursor);
    if (byDay.has(k) && byDay.get(k) > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
