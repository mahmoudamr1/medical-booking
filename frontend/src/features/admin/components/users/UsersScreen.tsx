'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Ban, RotateCcw, Users } from 'lucide-react';
import { adminApi } from '../../api';
import { adminKeys } from '../../hooks/keys';
import { AccountStatusBadge } from '../badges';
import { FilterBar, SearchBox, SelectFilter, useUrlFilters } from '../filters';
import { ListCard } from '../ListCard';
import { useConfirmAction } from '../../hooks/useStatusAction';
import type { AdminUser, UserStatus } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormat, useT } from '@/i18n/provider';
import { useAuth } from '@/lib/auth/AuthProvider';

const ROLES = ['patient', 'doctor', 'admin'] as const;
const STATUSES: UserStatus[] = ['active', 'suspended'];

export function UsersScreen() {
  const t = useT();
  const f = useFormat();
  const { user: me } = useAuth();
  const { values, set, page } = useUrlFilters(['q', 'role', 'status'] as const);

  const params = { q: values.q, role: values.role, status: values.status as UserStatus | '', page };
  const list = useQuery({
    queryKey: [...adminKeys.users, params],
    queryFn: () => adminApi.users(params),
    placeholderData: keepPreviousData,
  });

  const action = useConfirmAction<AdminUser, UserStatus>(
    (u, status, reason) => adminApi.setUserStatus(u.id, status, reason),
    [adminKeys.users, adminKeys.audit],
  );
  const suspending = action.target?.action === 'suspended';
  const shortDate = (v: string) =>
    f.date(v, undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.users.title')} description={t('admin.users.subtitle')} />

      <FilterBar>
        <SearchBox
          value={values.q}
          onCommit={(q) => set({ q })}
          placeholder={t('admin.users.searchPlaceholder')}
        />
        <SelectFilter
          id="users-role"
          label={t('admin.filters.role')}
          value={values.role}
          onChange={(role) => set({ role })}
          allLabel={t('admin.filters.all')}
          options={ROLES.map((r) => ({ value: r, label: t(`admin.users.roles.${r}`) }))}
        />
        <SelectFilter
          id="users-status"
          label={t('admin.filters.status')}
          value={values.status}
          onChange={(status) => set({ status })}
          allLabel={t('admin.filters.all')}
          options={STATUSES.map((s) => ({ value: s, label: t(`admin.users.status.${s}`) }))}
        />
      </FilterBar>

      <ListCard
        query={list}
        cols={5}
        empty={t('admin.users.empty')}
        emptyIcon={<Users aria-hidden />}
        onPageChange={(p) => set({ page: p })}
      >
        {(items) => (
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('admin.users.columns.user')}</TableHead>
                <TableHead>{t('admin.users.columns.roles')}</TableHead>
                <TableHead>{t('admin.users.columns.status')}</TableHead>
                <TableHead>{t('admin.users.columns.lastLogin')}</TableHead>
                <TableHead>{t('admin.users.columns.joined')}</TableHead>
                <TableHead className="pe-4">
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <TableRow key={u.id} data-testid={`user-row-${u.email}`}>
                    <TableCell className="ps-4">
                      <p className="flex items-center gap-2 font-medium">
                        {u.name}
                        {isMe && <Badge variant="info">{t('admin.users.you')}</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {u.email}
                        {u.phone && <> · {u.phone}</>}
                      </p>
                      {!u.email_verified && (
                        <p className="text-xs text-amber-700">{t('admin.users.unverified')}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="muted">
                            {(ROLES as readonly string[]).includes(r)
                              ? t(`admin.users.roles.${r as (typeof ROLES)[number]}`)
                              : r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <AccountStatusBadge status={u.status} />
                      {u.status === 'suspended' && u.status_reason && (
                        <p
                          className="mt-1 max-w-56 text-xs text-muted-foreground"
                          title={t('admin.users.statusReason')}
                        >
                          {u.status_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.last_login_at ? f.dateTime(u.last_login_at) : t('admin.never')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.created_at ? shortDate(u.created_at) : '—'}
                    </TableCell>
                    <TableCell className="pe-4 text-end">
                      {!isMe &&
                        (u.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => action.open(u, 'suspended')}
                          >
                            <Ban aria-hidden />
                            {t('admin.users.suspend')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => action.open(u, 'active')}
                          >
                            <RotateCcw aria-hidden />
                            {t('admin.users.reactivate')}
                          </Button>
                        ))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ListCard>

      <ConfirmDialog
        open={!!action.target}
        onOpenChange={(o) => !o && action.close()}
        title={
          action.target
            ? t(suspending ? 'admin.users.suspendTitle' : 'admin.users.reactivateTitle', {
                name: action.target.item.name,
              })
            : ''
        }
        description={suspending ? t('admin.users.suspendBody') : t('admin.users.reactivateBody')}
        confirmLabel={suspending ? t('admin.users.suspend') : t('admin.users.reactivate')}
        destructive={suspending}
        pending={action.pending}
        error={action.error}
        reason={
          suspending
            ? {
                label: t('admin.reasonRequired'),
                placeholder: t('admin.reasonPlaceholder'),
                required: true,
              }
            : undefined
        }
        onConfirm={action.confirm}
      />
    </div>
  );
}
