import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { blockComposingEnter } from '../../lib/ime'
import { formatMoney, MAX_VALUE, parseMoney } from '../../lib/money'
import { Button } from '../../ui/Button'
import { Combobox, type ComboboxOption } from '../../ui/Combobox'
import { DatePicker } from '../../ui/DatePicker'
import { DialogActions } from '../../ui/Dialog'
import { FieldRow, FieldStack, TextInput } from '../../ui/Field'
import { MoneyField } from '../../ui/MoneyField'
import { Select } from '../../ui/Select'
import { StageBadge } from '../badges'
import { requiredName, showSaveError } from '../forms'
import { isClosed, STAGES, usualProbability, type Meta, type StageKey } from '../meta'
import type { Deal, DealIn } from './api'

const schema = z
  .object({
    name: requiredName,
    value: z
      .string()
      .trim()
      .min(1, '금액을 입력해 주세요')
      .refine((text) => parseMoney(text) !== null, '금액은 숫자로 입력해 주세요. 예: 12,500')
      .refine((text) => (parseMoney(text) ?? 0) <= MAX_VALUE, `금액은 ${formatMoney(MAX_VALUE)}까지 입력할 수 있어요`),
    stage: z.enum(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
    probability: z
      .string()
      .trim()
      .refine((text) => /^\d{1,3}$/.test(text) && Number(text) <= 100, '확률은 0에서 100 사이의 숫자로 입력해 주세요'),
    close_date: z.string().nullable(),
    contact_id: z.number().nullable(),
    organization_id: z.number().nullable(),
  })
  .refine((values) => !isClosed(values.stage) || values.close_date !== null, {
    message: '수주나 실주에는 마감일이 필요해요',
    path: ['close_date'],
  })

type Values = z.infer<typeof schema>

export type ContactOption = ComboboxOption & { organization_id: number | null }

export type DealDefaults = { stage?: StageKey; organization_id?: number | null; contact_id?: number | null }

type Props = {
  initial?: Deal
  defaults?: DealDefaults
  meta: Meta
  contacts: readonly ContactOption[]
  organizations: readonly ComboboxOption[]
  onSave: (body: DealIn) => Promise<unknown>
  onCancel: () => void
}

/** Adding or editing a deal. Choosing a contact fills in their organization if
 * it's empty; changing the stage fills in its probability, and Won or Lost
 * today's close date. All of them can still be changed (FORM-4). */
export function DealForm({ initial, defaults, meta, contacts, organizations, onSave, onCancel }: Props) {
  const stage = initial?.stage ?? defaults?.stage ?? 'new'
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: initial?.name ?? '',
      value: initial ? formatMoney(initial.value) : '',
      stage,
      probability: String(initial?.probability ?? usualProbability(meta, stage) ?? 0),
      close_date: initial?.close_date ?? (isClosed(stage) ? meta.today : null),
      contact_id: initial?.contact_id ?? defaults?.contact_id ?? null,
      organization_id: initial?.organization_id ?? defaults?.organization_id ?? null,
    },
  })
  const { control, handleSubmit, formState, getValues, setValue } = form

  function chooseContact(contactId: number | null) {
    setValue('contact_id', contactId, { shouldDirty: true })
    const contact = contacts.find((item) => item.id === contactId)
    if (contact?.organization_id && getValues('organization_id') === null) {
      setValue('organization_id', contact.organization_id, { shouldDirty: true })
    }
  }

  function chooseStage(next: StageKey) {
    setValue('stage', next, { shouldDirty: true })
    setValue('probability', String(usualProbability(meta, next) ?? 0), { shouldDirty: true, shouldValidate: true })
    if (isClosed(next)) setValue('close_date', meta.today, { shouldDirty: true, shouldValidate: true })
  }

  async function submit(values: Values) {
    try {
      await onSave({
        name: values.name,
        value: parseMoney(values.value) ?? 0,
        stage: values.stage,
        probability: Number(values.probability),
        close_date: values.close_date,
        contact_id: values.contact_id,
        organization_id: values.organization_id,
      })
    } catch (error) {
      showSaveError(error, form)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} onKeyDown={blockComposingEnter} noValidate>
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
            name="value"
            render={({ field, fieldState }) => (
              <MoneyField
                label="금액"
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
          <Controller
            control={control}
            name="stage"
            render={({ field, fieldState }) => (
              <Select<StageKey>
                label="단계"
                name={field.name}
                options={STAGES.map((key) => ({
                  key,
                  label: meta.stages.find((item) => item.key === key)?.label ?? key,
                  render: <StageBadge stage={key} />,
                }))}
                value={field.value}
                onChange={chooseStage}
                onBlur={field.onBlur}
                buttonRef={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
        </FieldRow>
        <FieldRow>
          <Controller
            control={control}
            name="probability"
            render={({ field, fieldState }) => (
              <TextInput
                label="확률"
                name={field.name}
                inputMode="numeric"
                suffix="%"
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
            name="close_date"
            render={({ field, fieldState }) => (
              <DatePicker
                label="마감일"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                focusRef={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
        </FieldRow>
        <Controller
          control={control}
          name="contact_id"
          render={({ field, fieldState }) => (
            <Combobox
              label="주 연락처"
              name={field.name}
              options={contacts}
              placeholder="이름으로 찾기"
              value={field.value}
              onChange={chooseContact}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
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
