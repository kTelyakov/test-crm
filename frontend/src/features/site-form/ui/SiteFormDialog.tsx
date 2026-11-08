import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateSite, useRefreshData, useUpdateSite, type Site } from '@/shared/api';
import { Button, Dialog, Field, Input } from '@/shared/ui';
import { siteSchema, type SiteFormValues } from '../model/site-schema';

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если передан — редактирование, иначе создание. */
  site?: Site;
}

function SiteForm({ site, onDone }: { site?: Site; onDone: () => void }) {
  const refresh = useRefreshData();
  const create = useCreateSite();
  const update = useUpdateSite();
  const mutation = site ? update : create;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: { name: site?.name ?? '', address: site?.address ?? '' },
  });

  const submit = (data: SiteFormValues) => {
    const options = {
      onSuccess: async () => {
        await refresh();
        onDone();
      },
    };
    if (site) update.mutate({ id: site.id, data }, options);
    else create.mutate({ data }, options);
  };

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(submit)}>
      <Field label="Название" htmlFor="site-name" error={errors.name?.message}>
        <Input id="site-name" {...register('name')} />
      </Field>
      <Field label="Адрес" htmlFor="site-address" error={errors.address?.message}>
        <Input id="site-address" {...register('address')} />
      </Field>
      {mutation.error && (
        <p role="alert" className="text-sm text-red-600">
          {mutation.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Отмена
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}

export function SiteFormDialog({ open, onOpenChange, site }: SiteFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={site ? 'Изменить объект' : 'Новый объект'}
    >
      {/* Форма монтируется только при открытии, поэтому каждое открытие начинается с актуальных значений. */}
      {open && <SiteForm site={site} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}
