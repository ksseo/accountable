// What the forms share: the Korean messages, the field rules from the spec
// (DATA-3 to DATA-5), and turning the backend's 422 into messages under fields.

import { useQueryClient } from '@tanstack/react-query'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '../api/client'
import { toast } from '../app/toastStore'
import { topicParticle } from '../lib/korean'

export const requiredName = z
  .string()
  .trim()
  .min(1, '이름을 입력해 주세요')
  .max(200, '이름은 200자까지 입력할 수 있어요')

export const optionalText = (max: number, what: string) =>
  z.string().trim().max(max, `${what}${topicParticle(what)} ${max.toLocaleString('ko-KR')}자까지 입력할 수 있어요`)

export const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === '' || z.email().safeParse(value).success, '올바른 이메일 주소가 아니에요')

/** Empty text is sent as null. */
export const orNull = (value: string) => (value.trim() === '' ? null : value.trim())

// The backend's message types, in Korean.
const SERVER_MESSAGES: Record<string, string> = {
  missing: '입력해 주세요',
  string_too_short: '입력해 주세요',
  string_too_long: '너무 길어요',
  value_error: '올바른 값이 아니에요',
  missing_link: '찾을 수 없는 항목이에요. 다시 골라 주세요',
  close_date_required: '수주나 실주에는 마감일이 필요해요',
  future: '앞으로의 시간은 고를 수 없어요. 할 일은 후속 조치로 남겨 주세요',
  less_than_equal: '값이 너무 커요',
  greater_than_equal: '값이 너무 작아요',
}

/** After a failed save: messages under the fields the backend named, or a message
 * at the bottom of the page. */
export function showSaveError<T extends FieldValues>(error: unknown, form: UseFormReturn<T>): void {
  if (error instanceof ApiError && error.status === 422) {
    const names = Object.keys(error.fields).filter((name) => name in form.getValues())
    for (const name of names) {
      form.setError(name as Path<T>, { type: 'server', message: SERVER_MESSAGES[error.fields[name]] ?? '값을 확인해 주세요' })
    }
    if (names.length) {
      form.setFocus(names[0] as Path<T>)
      return
    }
  }
  toast(error instanceof ApiError && error.offline ? '서버에 연결할 수 없어 저장하지 못했어요.' : '저장하지 못했어요. 다시 시도해 주세요.', 'error')
}

/** After any save, the record, its lists, the pipeline and the dashboard are
 * fetched again. Fetching everything again is simplest, and the data is small. */
export function useRefreshAll(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}
