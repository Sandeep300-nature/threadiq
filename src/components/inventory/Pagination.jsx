import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Compute item index range
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(totalItems, currentPage * itemsPerPage);

  // Generate page numbers array with intelligent windowing
  const getPageNumbers = () => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="inventory-pagination-container">
      {/* Left: Range Label and Items-Per-Page Selector */}
      <div className="inventory-pagination-left">
        <span className="inventory-pagination-range font-tech">
          Showing <strong style={{ color: 'var(--text-white)' }}>{startItem}–{endItem}</strong> of{' '}
          <strong style={{ color: 'var(--text-white)' }}>{totalItems}</strong> products
        </span>

        <div className="inventory-pagination-per-page">
          <label htmlFor="items-per-page-select" className="font-tech text-dim" style={{ fontSize: '0.72rem' }}>
            Show:
          </label>
          <select
            id="items-per-page-select"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="pagination-select font-tech"
            aria-label="Items per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="font-tech text-dim" style={{ fontSize: '0.72rem' }}>per page</span>
        </div>
      </div>

      {/* Right: Bottom-Right Pagination Controls */}
      <div className="inventory-pagination-controls">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="pagination-btn pagination-nav-btn font-tech"
          aria-label="Previous Page"
        >
          <ChevronLeft size={14} />
          <span>Prev</span>
        </button>

        {/* Page Number Buttons */}
        <div className="pagination-pages-group">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis font-tech">
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`pagination-btn pagination-page-num font-tech ${isActive ? 'active' : ''}`}
                aria-label={`Page ${p}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="pagination-btn pagination-nav-btn font-tech"
          aria-label="Next Page"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
