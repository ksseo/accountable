import { zodResolver } from '@hookform/resolvers/zod'
import { useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { blockComposingEnter } from '../../lib/ime'
import { formatMoney, MAX_VALUE, parseMoney } from '../../lib/money'
import { Button } from '../../ui/Button'
import { Combobox, type ComboboxOption } from '../../ui/Combobox'
import { DatePicker } from '../../ui/DatePicker'
import { DialogActions, useUnsaved } from '../../ui/Dialog'
import { FieldRow, FieldStack, TextInput } from '../../ui/Field'
import { MoneyField } from '../../ui/MoneyField'
import { Select } from '../../ui/Select'
import { StageBadge } from '../badges'
import { requiredName, showSaveError } from '../forms'
import { isClosed, STAGES, usualProbability, type Meta, type StageKey } from '../meta'
import type { DealDefaults } from '../openForms'
import type { Deal, DealIn } from './api'

const schema = z
  .object({
    name: requiredName,
    value: z
      .string()
      .trim()
      .min(1, '금액을 입력해 주세요')
      .refine((text) => parseMoney(text) !== null, '금액은 숫자로 입력해 주세요. 예: 12,500')
      .refine(
        (text) => (parseMoney(text) ?? 0) <= MAX_VALUE,
        `금액은 ${formatMoney(MAX_VALUE)}까지 입력할 수 있어요`,
      ),
    stage: z.enum(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
    probability: z
      .string()
      .trim()
      .refine(
        (text) => /^\d{1,3}$/.test(text) && Number(text) <= 100,
        '확률은 0에서 100 사이의 숫자로 입력해 주세요',
      ),
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

type Props = {
  initial?: Deal
  defaults?: DealDefaults
  meta: Meta
  contacts: readonly ContactOption[]
  organizations: readonly ComboboxOption[]
  onSave: (body: DealIn) => Promise<unknown>
  onCancel: () => void
}

/** What the form starts with for a saved deal. */
function savedValues(deal: Deal): Values {
  return {
    name: deal.name,
    value: formatMoney(deal.value),
    stage: deal.stage,
    probability: String(deal.probability),
    close_date: deal.close_date,
    contact_id: deal.contact_id,
    organization_id: deal.organization_id,
  }
}

/** What it starts with for a new one, filled in for its stage as choosing that
 * stage would be (FORM-4). */
function newValues(meta: Meta, { stage = 'new', contact_id, organization_id }: DealDefaults = {}): Values {
  return {
    name: '',
    value: '',
    stage,
    probability: String(usualProbability(meta, stage) ?? 0),
    close_date: isClosed(stage) ? meta.today : null,
    contact_id: contact_id ?? null,
    organization_id: organization_id ?? null,
  }
}

/** Adding or editing a deal. Choosing a contact fills in their organization if
 * it's empty; changing the stage fills in its probability, and Won or Lost
 * today's close date. All of them can still be changed, and going back gives
 * back what was there (FORM-4). */
export function DealForm({ initial, defaults, meta, contacts, organizations, onSave, onCancel }: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: initial ? savedValues(initial) : newValues(meta, defaults),
  })
  const { control, handleSubmit, formState, getValues, setValue } = form
  useUnsaved(formState.isDirty)

  // What choosing a stage replaced: the probability at the deal's saved stage,
  // and the close date from before Won or Lost filled in today's.
  const replaced = useRef({
    probability: getValues('probability'),
    closeDate: initial?.close_date ?? null,
    filledToday: !initial && isClosed(getValues('stage')),
  })

  function chooseContact(contactId: number | null) {
    setValue('contact_id', contactId, { shouldDirty: true })
    const contact = contacts.find((item) => item.id === contactId)
    if (contact?.organization_id && getValues('organization_id') === null) {
      setValue('organization_id', contact.organization_id, { shouldDirty: true })
    }
  }

  function chooseStage(next: StageKey) {
    const kept = replaced.current
    const { stage: from, probability, close_date: closeDate } = getValues()
    if (from === initial?.stage) kept.probability = probability
    if (!kept.filledToday || closeDate !== meta.today) kept.closeDate = closeDate

    const isSaved = next === initial?.stage
    kept.filledToday = isClosed(next) && !isSaved
    const usual = String(usualProbability(meta, next) ?? 0)
    setValue('stage', next, { shouldDirty: true })
    setValue('probability', isSaved ? kept.probability : usual, { shouldDirty: true, shouldValidate: true })
    setValue('close_date', kept.filledToday ? meta.today : kept.closeDate, {
      shouldDirty: true,
      shouldValidate: true,
    })
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
        <Button variant="strong" type="submit" isDisabled={formState.isSubmitting}>
          저장
        </Button>
      </DialogActions>
    </form>
  )
}
