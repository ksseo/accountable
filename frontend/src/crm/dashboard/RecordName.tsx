import { RecordLink } from '../../ui/RecordLink'
import type { FollowUp } from './api'

/** The contact or deal an entry is on, with a contact's organization after it.
 * A deal's name stands alone, as in mockup 3, which keeps each row on one line. */
export function RecordName({ record }: { record: FollowUp['record'] }) {
  return (
    <>
      <RecordLink kind={record.kind} id={record.id}>
        {record.name}
      </RecordLink>
      {record.kind === 'contact' && record.organization_id !== null ? (
        <>
          {', '}
          <RecordLink kind="organization" id={record.organization_id}>
            {record.organization_name}
          </RecordLink>
        </>
      ) : null}
    </>
  )
}
