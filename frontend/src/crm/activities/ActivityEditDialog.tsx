import { Dialog } from '../../ui/Dialog'
import { ActivityForm, type ActivityValues } from './ActivityForm'
import type { TimelineEntry } from './api'

type Props = {
  /** The note, call or email being edited, or null when closed. */
  entry: TimelineEntry | null
  onSave: (entry: TimelineEntry, values: ActivityValues) => Promise<unknown>
  onClose: () => void
}

/** Editing a logged activity: kind, description, when, follow-up date and done (REC-6). */
export function ActivityEditDialog({ entry, onSave, onClose }: Props) {
  return (
    <Dialog title="활동 수정" isOpen={entry !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {entry ? <ActivityForm mode="edit" initial={entry} onSave={(values) => onSave(entry, values)} onCancel={onClose} /> : null}
    </Dialog>
  )
}
