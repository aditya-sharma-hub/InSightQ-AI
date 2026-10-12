import React, { useState } from 'https://esm.sh/react@18.2.0';
import {
  ArrowUpDownIcon, FilterIcon, SearchIcon, DownloadIcon,
  ChevronLeftIcon, ChevronRightIcon, PlusIcon
} from '../../assets/icons/icons.js';
import { StatusChip } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { LoadingSkeleton } from '../ui/EmptyState.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

export const EnterpriseTable = ({
  columns = [],
  data = [],
  isLoading = false,
  title = 'Enterprise Data Explorer',
  onSearch,
  onFilter
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const toggleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map((_, i) => i));
    }
  };

  const toggleSelectRow = (index) => {
    setSelectedRows(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSort = (colKey) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  return (
    React.createElement('div', {
      style: {
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)'
      }
    },
      /* Table Toolbar Bar */
      React.createElement('div', {
        style: {
          padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
        }
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          React.createElement('h3', { className: 'font-title' }, title),
          React.createElement('span', { className: 'badge' }, `${data.length} Records`)
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('div', { style: { position: 'relative', minWidth: 240 } },
            React.createElement('input', {
              type: 'text',
              placeholder: 'Filter table records...',
              className: 'input-field',
              style: { paddingLeft: 32, paddingRight: 12, height: 36 }
            }),
            React.createElement('div', {
              style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }
            }, React.createElement(SearchIcon, { size: 14 }))
          ),
          React.createElement(Button, { variant: 'secondary', size: 'sm', icon: FilterIcon }, 'Filters'),
          React.createElement(Button, { variant: 'secondary', size: 'sm', icon: DownloadIcon }, 'Export')
        )
      ),

      /* Scrollable Responsive Table Viewport */
      React.createElement('div', { style: { overflowX: 'auto', maxHeight: '560px' } },
        React.createElement('table', {
          style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }
        },
          /* Sticky Table Header */
          React.createElement('thead', {
            style: {
              position: 'sticky', top: 0, backgroundColor: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-strong)', zIndex: 10
            }
          },
            React.createElement('tr', null,
              React.createElement('th', { style: { padding: '12px 16px', width: 40 } },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: data.length > 0 && selectedRows.length === data.length,
                  onChange: toggleSelectAll,
                  style: { accentColor: 'var(--color-primary-500)' }
                })
              ),
              columns.map((col) => React.createElement('th', {
                key: col.key,
                onClick: () => col.sortable && handleSort(col.key),
                style: {
                  padding: '12px 16px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none'
                }
              },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  col.label,
                  col.sortable && React.createElement(ArrowUpDownIcon, {
                    size: 14,
                    color: sortColumn === col.key ? 'var(--color-primary-500)' : 'var(--text-tertiary)'
                  })
                )
              ))
            )
          ),

          /* Table Body Rows */
          React.createElement('tbody', null,
            isLoading && [1, 2, 3, 4, 5].map((idx) => React.createElement('tr', { key: idx },
              React.createElement('td', { style: { padding: '16px' } }, React.createElement(LoadingSkeleton, { width: 16, height: 16 })),
              columns.map((_, cIdx) => React.createElement('td', { key: cIdx, style: { padding: '16px' } },
                React.createElement(LoadingSkeleton, { width: `${60 + (cIdx * 10)}%`, height: 16 })
              ))
            )),

            !isLoading && data.length === 0 && React.createElement('tr', null,
              React.createElement('td', { colSpan: columns.length + 1, style: { padding: 48 } },
                React.createElement(EmptyState, {
                  title: 'No matching records',
                  description: 'Try adjusting your search query or filter parameters.',
                  actionText: 'Reset Filters'
                })
              )
            ),

            !isLoading && data.map((row, rIdx) => {
              const isSelected = selectedRows.includes(rIdx);
              return React.createElement('tr', {
                key: rIdx,
                style: {
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--color-primary-50)' : 'transparent',
                  transition: 'background-color 150ms ease'
                }
              },
                React.createElement('td', { style: { padding: '12px 16px' } },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: isSelected,
                    onChange: () => toggleSelectRow(rIdx),
                    style: { accentColor: 'var(--color-primary-500)' }
                  })
                ),
                columns.map((col) => React.createElement('td', {
                  key: col.key,
                  style: { padding: '12px 16px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }
                },
                  col.render ? col.render(row[col.key], row) : row[col.key]
                ))
              );
            })
          )
        )
      ),

      /* Table Pagination Bar */
      React.createElement('div', {
        style: {
          padding: '12px 20px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }
      },
        React.createElement('span', { className: 'font-caption', style: { color: 'var(--text-secondary)' } },
          `Showing ${data.length > 0 ? 1 : 0} to ${data.length} of ${data.length} records (${selectedRows.length} selected)`
        ),
        React.createElement('div', { style: { display: 'flex', gap: 8 } },
          React.createElement(Button, { variant: 'secondary', size: 'sm', icon: ChevronLeftIcon, isDisabled: currentPage === 1 }, 'Previous'),
          React.createElement(Button, { variant: 'secondary', size: 'sm', icon: ChevronRightIcon, iconPosition: 'right' }, 'Next')
        )
      )
    )
  );
};
