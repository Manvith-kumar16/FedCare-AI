import React from 'react';
import { Table } from 'react-bootstrap';

interface Column {
  header: string;
  accessor: string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  className?: string;
  loading?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({ columns, data, className = '', loading }) => {
  return (
    <div className={`table-responsive ${className}`}>
      <Table hover className="align-middle border-0">
        <thead className="bg-light border-0">
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                className="py-3 px-4 border-0 extra-small uppercase-spacing text-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span className="ms-2 small text-muted">Loading data...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-5 text-muted small">
                No records found.
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-bottom border-light">
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
  );
};

export default DataTable;
