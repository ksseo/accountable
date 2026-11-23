import { toast } from '../../app/toastStore'
import { Dialog } from '../../ui/Dialog'
import { useRefreshAll } from '../forms'
import { useMeta } from '../meta'
import { saveOrganization, type Organization } from './api'
import { OrganizationForm } from './OrganizationForm'

type Props = {
  /** The organization to edit, 'new' to add one, or null when closed. */
  target: Organization | 'new' | null
  onClose: () => void
  onSaved?: (organization: Organization) => void
}

export function OrganizationDialog({ target, onClose, onSaved }: Props) {
  const { data: meta } = useMeta()
  const refresh = useRefreshAll()
  const editing = target !== null && target !== 'new' ? target : undefined

  return (
    <Dialog
      title={editing ? '거래처 수정' : '거래처 추가'}
      isOpen={target !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      <OrganizationForm
        initial={editing}
        industries={meta?.industries ?? []}
        onCancel={onClose}
        onSave={async (body) => {
          const saved = await saveOrganization(editing?.id ?? null, body)
          onClose()
          toast('저장했어요')
          onSaved?.(saved)
          await refresh()
        }}
      />
    </Dialog>
  )
}
