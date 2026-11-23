import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { toast } from '../../app/toastStore'
import { Dialog } from '../../ui/Dialog'
import { SkeletonRows } from '../../ui/Skeleton'
import { useContacts } from '../contacts/api'
import { useRefreshAll } from '../forms'
import { useMeta } from '../meta'
import { useOrganizations } from '../organizations/api'
import { saveDeal, type Deal, type DealSaved } from './api'
import { DealForm, type DealDefaults } from './DealForm'

type Target = { mode: 'new'; defaults: DealDefaults } | { mode: 'edit'; deal: Deal }

type DealFormApi = {
  /** Opens the add form, with a stage or links already chosen. */
  openNew: (defaults?: DealDefaults) => void
  openEdit: (deal: Deal) => void
}

const DealFormContext = createContext<DealFormApi | null>(null)

/** The deal form, which the top bar's "영업 기회 추가", the tables, the board's
 * lanes and the record pages all open. */
export function useDealForm(): DealFormApi {
  const context = useContext(DealFormContext)
  if (!context) throw new Error('useDealForm needs DealFormProvider')
  return context
}

/** The messages after a deal is saved: "저장했어요", and if the save made the
 * main contact a customer, "김민준 님이 고객이 되었어요" (UI-4). */
export function announceDealSaved(saved: DealSaved, message = '저장했어요'): void {
  toast(message)
  if (saved.promoted_contact) toast(`${saved.promoted_contact.name} 님이 고객이 되었어요`)
}

export function DealFormProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null)
  const openNew = useCallback((defaults: DealDefaults = {}) => setTarget({ mode: 'new', defaults }), [])
  const openEdit = useCallback((deal: Deal) => setTarget({ mode: 'edit', deal }), [])
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])

  return (
    <DealFormContext.Provider value={value}>
      {children}
      {target ? <DealDialog target={target} onClose={() => setTarget(null)} /> : null}
    </DealFormContext.Provider>
  )
}

function DealDialog({ target, onClose }: { target: Target; onClose: () => void }) {
  const { data: meta } = useMeta()
  const { data: contacts } = useContacts()
  const { data: organizations } = useOrganizations()
  const refresh = useRefreshAll()
  const editing = target.mode === 'edit' ? target.deal : undefined

  const contactOptions = useMemo(
    () =>
      (contacts ?? []).map((contact) => ({
        id: contact.id,
        name: contact.name,
        detail: contact.organization_name,
        organization_id: contact.organization_id,
      })),
    [contacts],
  )
  const organizationOptions = useMemo(
    () => (organizations ?? []).map((org) => ({ id: org.id, name: org.name, detail: org.industry })),
    [organizations],
  )

  return (
    <Dialog title={editing ? '영업 기회 수정' : '영업 기회 추가'} isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      {meta && contacts && organizations ? (
        <DealForm
          initial={editing}
          defaults={target.mode === 'new' ? target.defaults : undefined}
          meta={meta}
          contacts={contactOptions}
          organizations={organizationOptions}
          onCancel={onClose}
          onSave={async (body) => {
            const saved = await saveDeal(editing?.id ?? null, body)
            onClose()
            announceDealSaved(saved)
            await refresh()
          }}
        />
      ) : (
        <SkeletonRows rows={5} />
      )}
    </Dialog>
  )
}
