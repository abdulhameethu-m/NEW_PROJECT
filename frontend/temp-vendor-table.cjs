const fs = require('fs');
const file = 'src/components/VendorPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
import { FixedSizeList } from 'react-window';
import React, { forwardRef, useState, useEffect } from 'react';

// Using forwardRef for react-window inner element
const innerElementType = forwardRef(({ style, ...rest }, ref) => (
  <tbody
    ref={ref}
    style={{ ...style, position: 'relative' }}
    className="divide-y divide-slate-100 dark:divide-slate-800"
    {...rest}
  />
));

export function VendorDataTable({ columns, rows, emptyMessage = "No records found." }) {
  const [containerHeight, setContainerHeight] = useState(600);

  if (!rows?.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{emptyMessage}</div>;
  }

  const ROW_HEIGHT = 56;
  const height = Math.min(rows.length * ROW_HEIGHT, containerHeight);

  const Row = ({ index, style }) => {
    const row = rows[index];
    return (
      <tr style={{ ...style, position: 'absolute', top: style.top, left: 0, width: '100%', display: 'flex' }} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        {columns.map((column) => (
          <td key={column.key} className="px-3 py-3 text-slate-700 dark:text-slate-200 truncate" style={{ flex: column.width ? \`0 0 \${column.width}px\` : '1 1 0%' }}>
            {column.render ? column.render(row) : row[column.key]}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm dark:divide-slate-800" style={{ display: 'block' }}>
        <thead style={{ display: 'flex', width: '100%' }}>
          <tr style={{ display: 'flex', width: '100%' }} className="border-b border-slate-200 dark:border-slate-800">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 truncate" style={{ flex: column.width ? \`0 0 \${column.width}px\` : '1 1 0%' }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <FixedSizeList
          height={height}
          itemCount={rows.length}
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

if (!content.includes('import { FixedSizeList }')) {
  // Add imports at top
  content = content.replace(
    'export function VendorSection',
    "import { FixedSizeList } from 'react-window';\nimport React, { forwardRef, useState } from 'react';\n\nexport function VendorSection"
  );
  
  // Define innerElementType before VendorDataTable
  content = content.replace(
    'export function VendorDataTable',
    `const innerElementType = forwardRef(({ style, ...rest }, ref) => (
  <tbody
    ref={ref}
    style={{ ...style, position: 'relative' }}
    className="divide-y divide-slate-100 dark:divide-slate-800"
    {...rest}
  />
));

export function VendorDataTable`
  );

  // Replace VendorDataTable implementation
  content = content.replace(
    /export function VendorDataTable[\s\S]*?<\/div>\n  \);\n}/m,
    `export function VendorDataTable({ columns, rows, emptyMessage = "No records found." }) {
  const [containerHeight, setContainerHeight] = useState(600);

  if (!rows?.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{emptyMessage}</div>;
  }

  const ROW_HEIGHT = 56;
  const height = Math.min(rows.length * ROW_HEIGHT, containerHeight);

  const Row = ({ index, style }) => {
    const row = rows[index];
    return (
      <tr style={{ ...style, position: 'absolute', top: style.top, left: 0, width: '100%', display: 'flex' }} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        {columns.map((column) => (
          <td key={column.key} className="px-3 py-3 text-slate-700 dark:text-slate-200 truncate" style={{ flex: column.width ? \`0 0 \${column.width}px\` : '1 1 0%' }}>
            {column.render ? column.render(row) : row[column.key]}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm dark:divide-slate-800" style={{ display: 'block' }}>
        <thead style={{ display: 'flex', width: '100%' }}>
          <tr style={{ display: 'flex', width: '100%' }} className="border-b border-slate-200 dark:border-slate-800">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 truncate" style={{ flex: column.width ? \`0 0 \${column.width}px\` : '1 1 0%' }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <FixedSizeList
          height={height}
          itemCount={rows.length}
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
}`
  );

  fs.writeFileSync(file, content);
  console.log('VendorDataTable virtualized');
} else {
  console.log('Already virtualized');
}
