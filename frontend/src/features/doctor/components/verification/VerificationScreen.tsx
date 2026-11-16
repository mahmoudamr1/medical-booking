'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Send, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { DoctorDocument, DocumentType } from '../../types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState, LoadingState, Skeleton } from '@/components/shared/states';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormAlert } from '@/components/shared/FormAlert';
import { VerificationBanner } from '../VerificationBanner';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { doctorApi } from '../../api';
import { doctorKeys } from '../../hooks/keys';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/ui/form';
import { errorMessage } from '@/lib/api/errors';
import { useFormat, useT } from '@/i18n/provider';
import { ME_QUERY_KEY } from '@/lib/auth/AuthProvider';

const DOC_TYPES: DocumentType[] = ['license', 'id_card', 'certificate', 'other'];
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

export function VerificationScreen() {
  const t = useT();
  const f = useFormat();
  const queryClient = useQueryClient();
  const profile = useDoctorProfile();
  const documents = useQuery({ queryKey: doctorKeys.documents, queryFn: doctorApi.documents });
  const [deleting, setDeleting] = useState<DoctorDocument | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const status = profile.data?.verification_status;
  const docsLocked = status === 'pending';
  const canSubmit = status === 'draft' || status === 'rejected';

  const remove = useMutation({
    mutationFn: (id: string) => doctorApi.deleteDocument(id),
    onSuccess: ({ message }) => {
      toast.success(message || t('common.deleted'));
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: doctorKeys.documents });
    },
    onError: (e) => {
      toast.error(errorMessage(e, t));
      setDeleting(null);
    },
  });

  const submit = useMutation({
    mutationFn: doctorApi.submitVerification,
    onSuccess: ({ data, message }) => {
      queryClient.setQueryData(doctorKeys.profile, data);
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      toast.success(message || t('doctorDash.submitted'));
      setSubmitOpen(false);
    },
    onError: (e) => setSubmitError(errorMessage(e, t)),
  });

  if (profile.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (profile.isError)
    return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('doctorDash.verificationTitle')}
        description={t('doctorDash.verificationHint')}
      />
      <VerificationBanner
        status={profile.data.verification_status}
        notes={profile.data.verification_notes}
        showLink={false}
      />

      {!docsLocked && <UploadForm />}

      <section className="rounded-xl border bg-card p-4 sm:p-6">
        {documents.isPending ? (
          <LoadingState />
        ) : documents.isError ? (
          <ErrorState error={documents.error} onRetry={() => documents.refetch()} />
        ) : documents.data.length === 0 ? (
          <EmptyState compact icon={FileText} title={t('doctorDash.noDocuments')} />
        ) : (
          <ul className="divide-y divide-border">
            {documents.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" aria-hidden />
                  <div>
                    <p className="font-medium text-foreground">
                      {t(`doctorDash.docTypes.${d.type}`)}
                    </p>
                    <p className="text-xs text-muted-foreground" dir="auto">
                      {d.original_name} · {f.number(d.size / 1024, 0)} KB
                      {d.uploaded_at ? ` · ${f.dateTime(d.uploaded_at)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <a
                    href={doctorApi.documentUrl(d.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-primary hover:bg-accent"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    {t('doctorDash.download')}
                  </a>
                  {!docsLocked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-red-600"
                      onClick={() => setDeleting(d)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canSubmit && (
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 flex justify-end rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-2">
          <Button
            className="gap-2 px-8"
            onClick={() => {
              setSubmitError(null);
              setSubmitOpen(true);
            }}
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            {t('doctorDash.submitVerification')}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('doctorDash.deleteDocumentTitle')}
        description={deleting?.original_name}
        confirmLabel={t('common.yesDelete')}
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title={t('doctorDash.submitTitle')}
        description={t('doctorDash.submitBody')}
        confirmLabel={t('doctorDash.submitVerification')}
        pending={submit.isPending}
        error={submitError}
        onConfirm={() => {
          setSubmitError(null);
          submit.mutate();
        }}
      />
    </div>
  );
}

function UploadForm() {
  const t = useT();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocumentType>('license');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: ({ docType, doc }: { docType: DocumentType; doc: File }) =>
      doctorApi.uploadDocument(docType, doc),
    onSuccess: ({ message }) => {
      toast.success(message || t('doctorDash.uploaded'));
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: doctorKeys.documents });
    },
    onError: (e) => setError(errorMessage(e, t)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) return setError(t('validation.required'));
    if (file.size > MAX_BYTES) return setError(t('doctorDash.fileTooLarge'));
    if (file.type && !ALLOWED.includes(file.type))
      return setError(t('doctorDash.verificationHint'));
    upload.mutate({ docType: type, doc: file });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[200px_1fr_auto] sm:items-end sm:p-6"
    >
      <Field label={t('doctorDash.documentType')} htmlFor="doc-type">
        <NativeSelect
          id="doc-type"
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
        >
          {DOC_TYPES.map((d) => (
            <option key={d} value={d}>
              {t(`doctorDash.docTypes.${d}`)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t('doctorDash.file')} htmlFor="doc-file">
        <input
          ref={inputRef}
          id="doc-file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-primary hover:file:bg-blue-100"
        />
      </Field>
      <Button type="submit" disabled={upload.isPending || !file} className="gap-2">
        <Upload className="h-4 w-4" aria-hidden />
        {upload.isPending ? t('doctorDash.uploading') : t('doctorDash.upload')}
      </Button>
      <div className="sm:col-span-3">
        <FormAlert message={error} />
      </div>
    </form>
  );
}
