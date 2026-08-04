const fs = require('fs');
const file = 'src/components/AdminTable.jsx';

const replacement = `
import { FixedSizeList } from 'react-window';
import React, { forwardRef, useState } from 'react';

const innerElementType = forwardRef(({ style, ...rest }, ref) => (
  <tbody
    ref={ref}
    style={{ ...style, position: 'relative' }}
    className="divide-y divide-slate-200 dark:divide-slate-800"
    {...rest}
  />
));

export function AdminTable({ columns, rows, renderRow, children }) {
  const [containerHeight] = useState(600);
  
  if (children && !rows) {
    // Fallback for non-virtualized legacy usage
    return (
      <div className="w-full overflow-x-auto rounded-2xl lg:rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-slate-50 text-left dark:bg-slate-950">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={\`whitespace-nowrap px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 \${
                    col.align === "right" ? "text-right" : ""
                  }\`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{children}</tbody>
        </table>
      </div>
    );
  }

  const ROW_HEIGHT = 64;
  const height = Math.min((rows?.length || 0) * ROW_HEIGHT, containerHeight) || 100;

  const Row = ({ index, style }) => {
    return renderRow({ row: rows[index], index, style });
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl lg:rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full border-separate border-spacing-0" style={{ display: 'block' }}>
        <thead className="bg-slate-50 text-left dark:bg-slate-950" style={{ display: 'flex', width: '100%' }}>
          <tr style={{ display: 'flex', width: '100%' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ flex: col.width ? \`0 0 \${col.width}px\` : '1 1 0%' }}
                className={\`whitespace-nowrap px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 \${
                  col.align === "right" ? "text-right" : ""
                }\`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <FixedSizeList
          height={height}
          itemCount={rows?.length || 0}
          itemSize={ROW_HEIGHT}
          width="100%"
          innerElementType={innerElementType}
          style={{ overflowX: 'hidden' }}
        >
          {Row}
        </FixedSizeList>
      </table>
    </div>
  );
}
`;

fs.writeFileSync(file, replacement);
console.log('AdminTable virtualized');
