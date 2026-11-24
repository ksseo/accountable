import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { blockComposingEnter } from '../../lib/ime'
import { Button } from '../../ui/Button'
import { SuggestInput } from '../../ui/Combobox'
import { DialogActions, useUnsaved } from '../../ui/Dialog'
import { FieldStack, TextInput } from '../../ui/Field'
import { optionalText, orNull, requiredName, showSaveError } from '../forms'
import type { Organization, OrganizationIn } from './api'

const schema = z.object({
  name: requiredName,
  industry: optionalText(200, '업종'),
  website: optionalText(2000, '웹사이트'),
  notes: optionalText(5000, '비고'),
})

type Values = z.infer<typeof schema>

type Props = {
  initial?: Organization
  industries: readonly string[]
  onSave: (body: OrganizationIn) => Promise<unknown>
  onCancel: () => void
}

/** Adding or editing an organization (DATA-3, FORM-2). */
export function OrganizationForm({ initial, industries, onSave, onCancel }: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: initial?.name ?? '',
      industry: initial?.industry ?? '',
      website: initial?.website ?? '',
      notes: initial?.notes ?? '',
    },
  })
  const { control, handleSubmit, formState } = form
  useUnsaved(formState.isDirty)

  async function submit(values: Values) {
    try {
      await onSave({
        name: values.name,
        industry: orNull(values.industry),
        website: orNull(values.website),
        notes: orNull(values.notes),
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
        <Controller
          control={control}
          name="industry"
          render={({ field, fieldState }) => (
            <SuggestInput
              label="업종"
              name={field.name}
              suggestions={industries}
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
          name="website"
          render={({ field, fieldState }) => (
            <TextInput
              label="웹사이트"
              name={field.name}
              type="url"
              inputMode="url"
              placeholder="hanbit.example"
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
          name="notes"
          render={({ field, fieldState }) => (
            <TextInput
              label="비고"
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
