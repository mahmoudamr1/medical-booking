import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { I18nProvider } from '@/i18n/provider';
import type { AppointmentStatus, Locale } from '@/types/api';

function renderBadge(status: AppointmentStatus, locale: Locale = 'en') {
  return render(
    <I18nProvider initialLocale={locale}>
      <StatusBadge status={status} />
    </I18nProvider>,
  );
}

describe('StatusBadge', () => {
  it.each([
    ['confirmed', 'Confirmed', 'success'],
    ['pending_confirmation', 'Pending confirmation', 'warning'],
    ['cancelled_by_doctor', 'Cancelled by doctor', 'muted'],
    ['rejected', 'Rejected', 'danger'],
    ['no_show', 'No-show', 'danger'],
  ] as const)('renders %s with its label and tone', (status, label, tone) => {
    renderBadge(status);
    const badge = screen.getByText(label);
    expect(badge).toHaveAttribute('data-status', status);
    expect(badge).toHaveAttribute('data-variant', tone);
  });

  it('localizes labels in Arabic', () => {
    renderBadge('completed', 'ar');
    expect(screen.getByText('مكتمل')).toBeInTheDocument();
  });
});
