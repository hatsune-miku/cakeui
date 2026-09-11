import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'
import { Button } from '../Button'

export interface PaginationProps extends ComponentPropsWithRef<'nav'> {
  page: number
  count: number
  onPageChange: (page: number) => void
  previousLabel?: string
  nextLabel?: string
  pageLabel?: (page: number) => string
}
function defaultPageLabel(value: number) {
  return `Page ${value}`
}
export function Pagination({
  page,
  count,
  onPageChange,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  pageLabel = defaultPageLabel,
  className,
  ...props
}: PaginationProps) {
  const total = Math.max(1, Number.isFinite(count) ? Math.floor(count) : 1)
  const current = Math.max(1, Math.min(total, Number.isFinite(page) ? Math.floor(page) : 1))
  const pages = Array.from(new Set([1, current - 1, current, current + 1, total]))
    .filter((value) => value > 0 && value <= total)
    .sort((a, b) => a - b)
  return (
    <nav aria-label="Pagination" {...props} className={cx('cake-pagination', className)}>
      <Button
        size="small"
        variant="ghost"
        aria-label={previousLabel}
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
      >
        ‹
      </Button>
      {pages.map((value, index) => (
        <span className="cake-pagination-part" key={value}>
          {index > 0 && value - pages[index - 1] > 1 && (
            <span className="cake-pagination-gap" aria-hidden="true">
              …
            </span>
          )}
          <Button
            size="small"
            aria-label={pageLabel(value)}
            aria-current={current === value ? 'page' : undefined}
            variant={current === value ? 'primary' : 'ghost'}
            onClick={() => onPageChange(value)}
          >
            {value}
          </Button>
        </span>
      ))}
      <Button
        size="small"
        variant="ghost"
        aria-label={nextLabel}
        disabled={current === total}
        onClick={() => onPageChange(current + 1)}
      >
        ›
      </Button>
    </nav>
  )
}
