import { useMemo } from 'react'
import { failedLoad } from '../../api/failedLoad'
import { toast } from '../../app/toastStore'
import { Dialog } from '../../ui/Dialog'
import { LoadError } from '../../ui/LoadError'
import { SkeletonRows } from '../../ui/Skeleton'
import { useRefreshAll } from '../forms'
import { useMeta } from '../meta'
import type { ContactDefaults } from '../openForms'
import { useOrganizations } from '../organizations/api'
import { saveContact, type Contact } from './api'
import { ContactForm } from './ContactForm'

type Props = {
  /** The contact to edit, 'new' to add one, or null when closed. */
  target: Contact | 'new' | null
  defaults?: ContactDefaults
  onClose: () => void
}

export function ContactDialog({ target, defaults, onClose }: Props) {
  const metaLoad = useMeta()
  const organizationsLoad = useOrganizations()
  const retry = failedLoad(metaLoad, organizationsLoad)
  const { data: meta } = metaLoad
  const { data: organizations } = organizationsLoad
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
      ) : retry ? (
        <LoadError onRetry={retry} />
      ) : (
        <SkeletonRows rows={4} />
      )}
    </Dialog>
  )
}
