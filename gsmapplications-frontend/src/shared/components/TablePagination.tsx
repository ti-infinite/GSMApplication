interface TablePaginationProps {
  page: number
  totalPages: number
  rowStart: number
  rowEnd: number
  total: number
  onPrev: () => void
  onNext: () => void
}

export default function TablePagination({
  page, totalPages, rowStart, rowEnd, total, onPrev, onNext,
}: TablePaginationProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="w-7 h-7 flex items-center justify-center rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        &lt;
      </button>
      <span className="text-xs text-gray-500 whitespace-nowrap px-1">
        {rowStart}–{rowEnd} of {total.toLocaleString()}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages - 1}
        className="w-7 h-7 flex items-center justify-center rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        &gt;
      </button>
    </div>
  )
}
