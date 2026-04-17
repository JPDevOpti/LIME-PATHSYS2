import { Case, getDateFromDateInfo } from '../types/case.types';
import { calculateBusinessDays } from '@/shared/utils/dateUtils';

export function getElapsedDays(c: Case): number {
  const status = c.status;
  const isFinished = status === "Completado" || status === "Por entregar";
  const storedTime = c.opportunity_info?.[0]?.opportunity_time;
  if (isFinished && storedTime !== undefined && storedTime !== null) {
    return Math.floor(storedTime);
  }
  const start = getDateFromDateInfo(c.date_info, "created_at");
  if (!start) return 0;
  return calculateBusinessDays(start);
}

export function getWasTimely(c: Case): boolean | undefined {
  return c.opportunity_info?.[0]?.was_timely;
}

export function getMaxOpportunityTime(c: Case): number | undefined {
  return c.opportunity_info?.[0]?.max_opportunity_time;
}
