import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'
import { z } from 'zod'
import { blockComposingEnter } from '../../lib/ime'
import { Button } from '../../ui/Button'
import { Checkbox } from '../../ui/Checkbox'
import { DatePicker } from '../../ui/DatePicker'
import { DateTimeField } from '../../ui/DateTimeField'
import { DialogActions } from '../../ui/Dialog'
import { FieldRow, FieldStack, TextInput } from '../../ui/Field'
import fieldStyles from '../../ui/Field.module.css'
import { showSaveError } from '../forms'
import { kindLabel, useMeta } from '../meta'
import segmentStyles from '../tables.module.css'
import type { LoggedKind, TimelineEntry } from './api'
import styles from './Activities.module.css'
import { KIND_ICONS, LOGGED_KINDS } from './kinds'

// A minute of slack, as the backend allows, for a clock a little ahead.
const FUTURE_SLACK_MS = 60_000

const schema = z.object({
  kind: z.enum(['note', 'call', 'email']),
  description: z
    .string()
    .trim()
    .min(1, '내용을 입력해 주세요')
    .max(5000, '내용은 5,000자까지 입력할 수 있어요'),
  occurred_at: z
    .string()
    .nullable()
    // A plain boolean, so the form's values keep null while the field is empty.
    .refine((value): boolean => value !== null, '언제였는지 입력해 주세요')
    .refine(
      (value) => value === null || new Date(value).getTime() <= Date.now() + FUTURE_SLACK_MS,
      '앞으로의 시간은 고를 수 없어요. 할 일은 후속 조치로 남겨 주세요',
    ),
  follow_up_date: z.string().nullable(),
  follow_up_done: z.boolean(),
})

export type ActivityValues = { kind: LoggedKind; description: string; occurred_at: string; follow_up_date: string | null; follow_up_done: boolean }
type Values = z.infer<typeof schema>

/** Now, to the minute. */
const now = () => {
  const moment = new Date()
  moment.setSeconds(0, 0)
  return moment.toISOString()
}

type Props = {
  /** Logging a new activity above the timeline, or editing one in a dialog. */
  mode: 'log' | 'edit'
  initial?: TimelineEntry
  onSave: (values: ActivityValues) => Promise<unknown>
  onCancel?: () => void
}

/** Logging a note, call or email with an optional follow-up (REC-5), or
 * editing one, with its done box (REC-6). */
export function ActivityForm({ mode, initial, onSave, onCancel }: Props) {
  const { data: meta } = useMeta()
  const kindLabelId = useId()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      kind: (initial?.kind as LoggedKind | undefined) ?? 'note',
      description: initial?.description ?? '',
      occurred_at: initial?.occurred_at ?? now(),
      follow_up_date: initial?.follow_up_date ?? null,
      follow_up_done: initial?.follow_up_done ?? false,
    },
  })
  const { control, handleSubmit, formState, watch } = form
  const followUp = watch('follow_up_date')

  async function submit(values: Values) {
    try {
      await onSave({
        kind: values.kind,
        description: values.description.trim(),
        occurred_at: values.occurred_at!,
        follow_up_date: values.follow_up_date,
        follow_up_done: values.follow_up_date ? values.follow_up_done : false,
      })
    } catch (error) {
      showSaveError(error, form)
      return
    }
    if (mode === 'log') {
      form.reset({ kind: values.kind, description: '', occurred_at: now(), follow_up_date: null, follow_up_done: false })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      onKeyDown={blockComposingEnter}
      noValidate
      aria-label={mode === 'log' ? '활동 기록' : undefined}
    >
      <FieldStack>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <div className={fieldStyles.field}>
              <span className={fieldStyles.label} id={kindLabelId}>
                종류
              </span>
              <ToggleButtonGroup
                className={`${segmentStyles.segments} ${styles.kinds}`}
                aria-labelledby={kindLabelId}
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[field.value]}
                onSelectionChange={(keys) => {
                  const [key] = [...keys]
                  if (key) field.onChange(key as LoggedKind)
                }}
              >
                {LOGGED_KINDS.map((kind) => {
                  const Icon = KIND_ICONS[kind]
                  return (
                    <ToggleButton key={kind} id={kind} className={segmentStyles.segment}>
                      <Icon size={15} aria-hidden="true" />
                      {kindLabel(meta, kind)}
                    </ToggleButton>
                  )
                })}
              </ToggleButtonGroup>
            </div>
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <TextInput
              label="내용"
              isRequired
              multiline
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
            name="occurred_at"
            render={({ field, fieldState }) => (
              <DateTimeField
                label="언제"
                isRequired
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                focusRef={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="follow_up_date"
            render={({ field, fieldState }) => (
              <DatePicker
                label="후속 조치"
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
        {mode === 'edit' && followUp ? (
          <Controller
            control={control}
            name="follow_up_done"
            render={({ field }) => (
              <Checkbox isSelected={field.value} onChange={field.onChange}>
                후속 조치 완료
              </Checkbox>
            )}
          />
        ) : null}
      </FieldStack>
      {mode === 'log' ? (
        <div className={styles.logActions}>
          <Button type="submit" variant="dark" isDisabled={formState.isSubmitting}>
            기록
          </Button>
        </div>
      ) : (
        <DialogActions>
          <Button onPress={onCancel}>취소</Button>
          <Button type="submit" variant="dark" isDisabled={formState.isSubmitting}>
            저장
          </Button>
        </DialogActions>
      )}
    </form>
  )
}
