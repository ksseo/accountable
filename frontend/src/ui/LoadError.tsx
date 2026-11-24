import { Button } from './Button'
import { EmptyState } from './EmptyState'

/** Shown instead of something that couldn't be loaded (UI-5). While the backend
 * is down the banner says so and the page retries by itself, so this isn't for that. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      message="불러오지 못했어요"
      action={
        <Button variant="page" onPress={onRetry}>
          다시 시도
        </Button>
      }
    />
  )
}
