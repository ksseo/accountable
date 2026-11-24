// Telling when a Korean letter is still being typed (FORM-7).
//
// Korean is typed through an input method: "한" is built from ㅎ, ㅏ and ㄴ, and
// until it's finished the input holds a letter in progress. Submitting then
// would act on half a letter.

/** Whether a key event belongs to a letter still being typed. Chrome and
 * Safari mark it with isComposing; some report key code 229 instead. */
function isComposing(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229
}

function preventComposingEnter(event: KeyboardEvent): void {
  if (event.key === 'Enter' && isComposing(event)) event.preventDefault()
}

/** A form's ref: Enter while a letter is still being typed doesn't submit. */
export function blockComposingEnter(form: HTMLFormElement): () => void {
  form.addEventListener('keydown', preventComposingEnter)
  return () => form.removeEventListener('keydown', preventComposingEnter)
}
