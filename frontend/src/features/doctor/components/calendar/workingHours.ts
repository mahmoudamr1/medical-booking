/** Working-hours model used to shade the doctor calendar (weekly windows with exceptions applied). */
import type { ScheduleBreak, ScheduleException, ScheduleWindow } from '../../types';
import { dayOfWeekOfKey } from '@/lib/dates';

export interface DayHours {
  /** Working windows (HH:MM) after exceptions are applied. */
  windows: { starts_at: string; ends_at: string; branch: string | null; breaks: ScheduleBreak[] }[];
  /** Whole-day closure (holiday) for all locations. */
  closed: boolean;
  /** Custom hours replace the weekly windows on this date. */
  custom: boolean;
  exception: ScheduleException | null;
}

/**
 * Applies schedule exceptions to the weekly windows for one date. A closed exception without a branch
 * closes the whole day; with a branch it removes that branch's windows. Custom hours replace the
 * windows of the affected branch (or all of them).
 */
export function hoursForDate(
  key: string,
  schedules: ScheduleWindow[],
  exceptions: ScheduleException[],
): DayHours {
  const dow = dayOfWeekOfKey(key);
  let windows = schedules
    .filter((s) => s.day_of_week === dow)
    .map((s) => ({
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      branch: s.clinic_branch_id,
      breaks: s.breaks ?? [],
    }));
  const todays = exceptions.filter((e) => e.date === key);
  let closed = false;
  let custom = false;
  for (const e of todays) {
    if (e.type === 'closed') {
      closed = closed || !e.clinic_branch_id;
      windows = e.clinic_branch_id ? windows.filter((w) => w.branch !== e.clinic_branch_id) : [];
    } else if (e.starts_at && e.ends_at) {
      custom = true;
      windows = e.clinic_branch_id ? windows.filter((w) => w.branch !== e.clinic_branch_id) : [];
      windows.push({
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        branch: e.clinic_branch_id,
        breaks: [],
      });
    }
  }
  windows.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return { windows, closed, custom, exception: todays[0] ?? null };
}

export function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Assigns overlapping items to side-by-side lanes (lane index + lane count per id). */
export function layoutLanes(
  items: { id: string; start: number; end: number }[],
): Map<string, { lane: number; lanes: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const result = new Map<string, { lane: number; lanes: number }>();
  let cluster: string[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const id of cluster)
      result.set(id, { lane: result.get(id)!.lane, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    if (it.start >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) lane = laneEnds.push(it.end) - 1;
    else laneEnds[lane] = it.end;
    result.set(it.id, { lane, lanes: 1 });
    cluster.push(it.id);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return result;
}
