import { FiLoader } from 'react-icons/fi';

const DataTable = ({ columns, data, isLoading, onRowClick }) => {
  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="animate-pulse flex flex-col">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex border-b border-gray-100 p-4 gap-4">
              {[...Array(columns.length)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
        No records found.
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col, i) => (
                <th key={i} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr 
                key={row.id || i} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col, j) => (
                  <td key={j} className="p-4 text-sm text-dark whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3 w-full bg-transparent">
        {data.map((row, i) => (
          <div 
            key={row.id || i} 
            onClick={() => onRowClick && onRowClick(row)}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${onRowClick ? 'cursor-pointer' : ''}`}
          >
            {columns.map((col, j) => (
              <div key={j} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500 font-medium">
                  {col.header}
                </span>
                <span className="text-sm font-semibold text-dark text-right max-w-[60%] truncate overflow-visible whitespace-normal">
                  {col.render ? col.render(row) : row[col.accessor]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default DataTable;
