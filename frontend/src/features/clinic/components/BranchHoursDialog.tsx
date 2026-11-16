'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import type { Branch, BranchHours } from '@/types/api';
import { FormAlert } from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { clinicApi } from '../api';
import { clinicKeys } from '../hooks/keys';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { useClinic } from './ClinicContext';
import { WEEK_ORDER } from '../hooks/useClinicData';

type Range = { opens_at: string; closes_at: string };

/** Weekly opening-hours editor: zero or more ranges per day (PUT …/branches/{b}/hours replaces all). */
export function BranchHoursDialog({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const [days, setDays] = useState<Record<number, Range[]>>(() => {
    const init: Record<number, Range[]> = {};
    for (const d of WEEK_ORDER) init[d] = [];
    for (const h of branch.hours ?? [])
      init[h.day_of_week].push({ opens_at: h.opens_at, closes_at: h.closes_at });
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (day: number, fn: (ranges: Range[]) => Range[]) =>
    setDays((prev) => ({ ...prev, [day]: fn(prev[day]) }));

  const save = async () => {
    const hours: BranchHours[] = WEEK_ORDER.flatMap((d) =>
      days[d].map((r) => ({ day_of_week: d, ...r })),
    );
    if (hours.some((h) => !h.opens_at || !h.closes_at || h.closes_at <= h.opens_at)) {
      setError(t('clinic.branches.invalidHours'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await clinicApi.saveHours(clinicId, branch.id, hours);
      toast.success(t('clinic.branches.hoursSaved'));
      queryClient.invalidateQueries({ queryKey: clinicKeys.of(clinicId, 'branches') });
      onClose();
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-start">
          <DialogTitle>{t('clinic.branches.hoursTitle', { branch: f.l(branch) })}</DialogTitle>
          <DialogDescription>{t('clinic.branches.hoursHint')}</DialogDescription>
        </DialogHeader>
        <FormAlert message={error} />
        <ul className="divide-y rounded-xl border">
          {WEEK_ORDER.map((day) => (
            <li key={day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
              <span className="w-28 shrink-0 pt-2 text-sm font-medium">{f.weekday(day)}</span>
              <div className="flex-1 space-y-2">
                {days[day].length === 0 && (
                  <p className="pt-2 text-sm text-muted-foreground">
                    {t('clinic.branches.closed')}
                  </p>
                )}
                {days[day].map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${f.weekday(day)} ${t('clinic.branches.opensAt')}`}
                      className="w-32"
                      value={r.opens_at}
                      onChange={(e) =>
                        update(day, (rs) =>
                          rs.map((x, j) => (j === i ? { ...x, opens_at: e.target.value } : x)),
                        )
                      }
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      aria-label={`${f.weekday(day)} ${t('clinic.branches.closesAt')}`}
                      className="w-32"
                      value={r.closes_at}
                      onChange={(e) =>
                        update(day, (rs) =>
                          rs.map((x, j) => (j === i ? { ...x, closes_at: e.target.value } : x)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('clinic.branches.removeInterval')}
                      onClick={() => update(day, (rs) => rs.filter((_, j) => j !== i))}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={days[day].length >= 3}
                onClick={() =>
                  update(day, (rs) => [
                    ...rs,
                    rs.length
                      ? { opens_at: '17:00', closes_at: '21:00' }
                      : { opens_at: '09:00', closes_at: '17:00' },
                  ])
                }
              >
                <Plus aria-hidden />
                {t('clinic.branches.addInterval')}
              </Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
