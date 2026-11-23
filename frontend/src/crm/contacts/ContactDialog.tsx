import { useMemo } from 'react'
import { toast } from '../../app/toastStore'
import { Dialog } from '../../ui/Dialog'
import { SkeletonRows } from '../../ui/Skeleton'
import { useRefreshAll } from '../forms'
import { useMeta } from '../meta'
import { useOrganizations } from '../organizations/api'
import { saveContact, type Contact } from './api'
import { ContactForm } from './ContactForm'

type Props = {
  /** The contact to edit, 'new' to add one, or null when closed. */
  target: Contact | 'new' | null
  defaults?: { organization_id?: number | null }
  onClose: () => void
}

export function ContactDialog({ target, defaults, onClose }: Props) {
  const { data: meta } = useMeta()
  const { data: organizations } = useOrganizations()
  const refresh = useRefreshAll()
  const editing = target !== null && target !== 'new' ? target : undefined
  const options = useMemo(
    () => (organizations ?? []).map((org) => ({ id: org.id, name: org.name, detail: org.industry })),
    [organizations],
  )

  return (
    <Dialog
      title={editing ? '연락처 수정' : '연락처 추가'}
      isOpen={target !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      {meta && organizations ? (
        <ContactForm
          initial={editing}
          defaults={defaults}
          meta={meta}
          organizations={options}
          onCancel={onClose}
          onSave={async (body) => {
            await saveContact(editing?.id ?? null, body)
            onClose()
            toast('저장했어요')
            await refresh()
          }}
        />
      ) : (
        <SkeletonRows rows={4} />
      )}
    </Dialog>
  )
}
