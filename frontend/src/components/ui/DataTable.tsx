import React, { useState, useMemo } from 'react';
import { Table, InputGroup, Form, Pagination } from 'react-bootstrap';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

interface Column {
  header: string;
  accessor: string;
  render?: (row: any) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  className?: string;
  loading?: boolean;
  pageSize?: number;
  searchable?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  className = '',
  loading,
  pageSize = 5,
  searchable = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  // Search filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(row =>
      columns.some(col => String(row[col.accessor] ?? '').toLowerCase().includes(q))
    );
  }, [data, searchQuery, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortConfig) return filtered;
    return [...filtered].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortConfig]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (accessor: string) => {
    setSortConfig(prev =>
      prev?.key === accessor
        ? { key: accessor, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: accessor, dir: 'asc' }
    );
    setCurrentPage(1);
  };

  const SortIcon: React.FC<{ col: string }> = ({ col }) => {
    if (sortConfig?.key !== col) return <ChevronUp size={12} className="ms-1 opacity-25" />;
    return sortConfig.dir === 'asc'
      ? <ChevronUp size={12} className="ms-1 text-primary" />
      : <ChevronDown size={12} className="ms-1 text-primary" />;
  };

  return (
    <div className={className}>
      {searchable && (
        <div className="mb-3">
          <InputGroup size="sm">
            <InputGroup.Text className="bg-light border-end-0 border-light">
              <Search size={14} className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              className="bg-light border-start-0 border-light small"
              placeholder="Filter records..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </InputGroup>
        </div>
      )}

      <div className="table-responsive">
        <Table hover className="align-middle border-0 mb-0">
          <thead className="bg-light border-0">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3 px-4 border-0 extra-small uppercase-spacing text-muted ${col.sortable !== false ? 'cursor-pointer user-select-none' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.accessor)}
                >
                  <span className="d-inline-flex align-items-center">
                    {col.header}
                    {col.sortable !== false && <SortIcon col={col.accessor} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary" role="status" />
                  <span className="ms-2 small text-muted">Loading data...</span>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-5 text-muted small">
                  {searchQuery ? `No results matching "${searchQuery}"` : 'No records found.'}
                </td>
              </tr>
            ) : (
              paginated.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-bottom border-light" style={{ animation: `fadeIn 0.2s ease ${rowIdx * 0.03}s both` }}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="py-3 px-4 small border-0">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between mt-3 px-2">
          <span className="extra-small text-muted">
            Showing {Math.min((currentPage - 1) * pageSize + 1, sorted.length)}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <Pagination size="sm" className="mb-0">
            <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} />
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item
                key={i + 1}
                active={currentPage === i + 1}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} />
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default DataTable;
