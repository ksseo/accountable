// Telling when a Korean letter is still being typed (TBL-2, FORM-7).
//
// Korean is typed through an input method: "한" is built from ㅎ, ㅏ and ㄴ, and
// until it's finished the input holds a letter in progress. Searching or
// submitting then would act on half a letter.

type KeyLike = { isComposing?: boolean; keyCode?: number; nativeEvent?: { isComposing?: boolean } }

/** Whether a key event belongs to a letter still being typed. Chrome and
 * Safari mark it with isComposing; some report key code 229 instead. */
export function isComposing(event: KeyLike): boolean {
  return Boolean(event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229)
}

/** A form's onKeyDown: Enter while a letter is still being typed doesn't submit. */
export function blockComposingEnter(event: KeyLike & { key: string; preventDefault(): void }): void {
  if (event.key === 'Enter' && isComposing(event)) event.preventDefault()
}
