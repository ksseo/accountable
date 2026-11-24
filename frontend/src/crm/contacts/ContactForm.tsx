import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { blockComposingEnter } from '../../lib/ime'
import { Button } from '../../ui/Button'
import { Combobox, type ComboboxOption } from '../../ui/Combobox'
import { DialogActions, useUnsaved } from '../../ui/Dialog'
import { FieldRow, FieldStack, TextInput } from '../../ui/Field'
import { Select } from '../../ui/Select'
import { optionalEmail, optionalText, orNull, requiredName, showSaveError } from '../forms'
import type { Meta, StatusKey } from '../meta'
import type { ContactDefaults } from '../openForms'
import type { Contact, ContactIn } from './api'

const schema = z.object({
  name: requiredName,
  email: optionalEmail,
  phone: optionalText(40, '전화번호'),
  job_title: optionalText(200, '직책'),
  organization_id: z.number().nullable(),
  status: z.enum(['lead', 'qualified', 'customer']),
})

type Values = z.infer<typeof schema>

type Props = {
  initial?: Contact
  /** Filled in when adding from an organization's page. */
  defaults?: ContactDefaults
  meta: Meta
  organizations: readonly ComboboxOption[]
  onSave: (body: ContactIn) => Promise<unknown>
  onCancel: () => void
}

/** Adding or editing a contact (DATA-4, FORM-2, FORM-3). */
export function ContactForm({ initial, defaults, meta, organizations, onSave, onCancel }: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: initial?.name ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      job_title: initial?.job_title ?? '',
      organization_id: initial?.organization_id ?? defaults?.organization_id ?? null,
      status: initial?.status ?? 'lead',
    },
  })
  const { control, handleSubmit, formState } = form
  useUnsaved(formState.isDirty)

  async function submit(values: Values) {
    try {
      await onSave({
        name: values.name,
        email: orNull(values.email),
        phone: orNull(values.phone),
        job_title: orNull(values.job_title),
        organization_id: values.organization_id,
        status: values.status,
      })
    } catch (error) {
      showSaveError(error, form)
    }
  }

  return (
    <form ref={blockComposingEnter} onSubmit={handleSubmit(submit)} noValidate>
      <FieldStack>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextInput
              label="이름"
              isRequired
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
        <FieldRow>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextInput
                label="이메일"
                type="email"
                inputMode="email"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <TextInput
                label="전화번호"
                type="tel"
                inputMode="tel"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
        </FieldRow>
        <FieldRow>
          <Controller
            control={control}
            name="job_title"
            render={({ field, fieldState }) => (
              <TextInput
                label="직책"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="status"
            render={({ field, fieldState }) => (
              <Select<StatusKey>
                label="상태"
                name={field.name}
                options={meta.statuses.map((status) => ({ key: status.key, label: status.label }))}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                buttonRef={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
        </FieldRow>
        <Controller
          control={control}
          name="organization_id"
          render={({ field, fieldState }) => (
            <Combobox
              label="거래처"
              name={field.name}
              options={organizations}
              placeholder="거래처 이름으로 찾기"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
      </FieldStack>
      <DialogActions>
        <Button variant="page" onPress={onCancel}>
          취소
        </Button>
        <Button variant="dark" type="submit" isDisabled={formState.isSubmitting}>
          저장
        </Button>
      </DialogActions>
    </form>
  )
}
