/**
 * List Virtualization Utilities
 * Efficiently render large lists by only rendering visible items
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';

/**
 * Virtual list component for rendering large lists
 */
export function VirtualList({
  items,
  itemHeight,
  height = 400,
  renderItem,
  className = '',
  buffer = 5,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / itemHeight) + buffer
  );

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, idx) => (
            <div key={startIndex + idx} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for virtual scrolling
 */
export function useVirtualScroll(items, itemHeight, containerHeight, buffer = 5) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
  );

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    containerRef,
    visibleItems,
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight,
    totalHeight: items.length * itemHeight,
    handleScroll,
  };
}

/**
 * Virtualized table component
 */
export function VirtualTable({
  columns,
  rows,
  rowHeight = 40,
  headerHeight = 40,
  containerHeight = 500,
  renderCell,
  className = '',
}) {
  const tableBodyRef = useRef(null);
  const { 
    visibleItems, 
    startIndex, 
    offsetY, 
    totalHeight, 
    handleScroll 
  } = useVirtualScroll(rows, rowHeight, containerHeight - headerHeight);

  return (
    <div className={`flex flex-col border ${className}`}>
      {/* Table Header */}
      <div className="flex bg-gray-100 border-b sticky top-0" style={{ height: headerHeight }}>
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 font-semibold text-sm"
            style={{ flex: column.width || 1, minWidth: column.minWidth || '100px' }}
          >
            {column.label}
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div
        ref={tableBodyRef}
        className="overflow-y-auto flex-1"
        style={{ height: containerHeight - headerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((row, idx) => (
              <div
                key={startIndex + idx}
                className="flex border-b hover:bg-gray-50"
                style={{ height: rowHeight }}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="px-4 py-2 flex items-center text-sm"
                    style={{ flex: column.width || 1, minWidth: column.minWidth || '100px' }}
                  >
                    {renderCell ? renderCell(row, column) : row[column.key]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Virtualized list with dynamic heights
 */
export function DynamicVirtualList({
  items,
  estimatedItemHeight = 60,
  height = 500,
  renderItem,
  className = '',
  buffer = 5,
  onHeightChange = null,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState({});
  const containerRef = useRef(null);
  const itemRefs = useRef({});

  // Calculate total height
  const totalHeight = items.reduce(
    (sum, item, idx) => sum + (itemHeights[idx] || estimatedItemHeight),
    0
  );

  // Calculate visible range based on scroll position
  let currentY = 0;
  let startIndex = 0;
  let endIndex = items.length;

  for (let i = 0; i < items.length; i++) {
    const itemHeight = itemHeights[i] || estimatedItemHeight;

    if (currentY + itemHeight > scrollTop - estimatedItemHeight * buffer) {
      startIndex = i;
      break;
    }
    currentY += itemHeight;
  }

  currentY = 0;
  for (let i = 0; i < items.length; i++) {
    const itemHeight = itemHeights[i] || estimatedItemHeight;
    currentY += itemHeight;

    if (currentY > scrollTop + height + estimatedItemHeight * buffer) {
      endIndex = i + 1;
      break;
    }
  }

  // Get offset
  let offsetY = 0;
  for (let i = 0; i < startIndex; i++) {
    offsetY += itemHeights[i] || estimatedItemHeight;
  }

  const visibleItems = items.slice(startIndex, Math.min(endIndex + 1, items.length));

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const measureItem = useCallback(
    (index, el) => {
      if (el && !itemHeights[index]) {
        const height = el.getBoundingClientRect().height;
        setItemHeights(prev => ({
          ...prev,
          [index]: height,
        }));

        if (onHeightChange) {
          onHeightChange(index, height);
        }
      }
    },
    [itemHeights, onHeightChange]
  );

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, idx) => {
            const actualIndex = startIndex + idx;
            return (
              <div
                key={actualIndex}
                ref={(el) => {
                  if (el) {
                    itemRefs.current[actualIndex] = el;
                    measureItem(actualIndex, el);
                  }
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Grid virtualization
 */
export function VirtualGrid({
  items,
  columnCount,
  itemHeight = 200,
  containerHeight = 600,
  gap = 16,
  renderItem,
  className = '',
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const rowHeight = itemHeight + gap;
  const visibleRows = Math.ceil(containerHeight / rowHeight) + 1;
  const startRow = Math.floor(scrollTop / rowHeight);
  const endRow = startRow + visibleRows;

  const visibleItems = [];
  const itemsPerRow = columnCount;

  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < itemsPerRow; col++) {
      const idx = row * itemsPerRow + col;
      if (idx < items.length) {
        visibleItems.push({ item: items[idx], index: idx });
      }
    }
  }

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const totalHeight = Math.ceil(items.length / columnCount) * rowHeight;
  const offsetY = startRow * rowHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          <div className="flex flex-wrap" style={{ gap }}>
            {visibleItems.map(({ item, index }) => (
              <div
                key={index}
                style={{
                  width: `calc(${100 / columnCount}% - ${gap * (columnCount - 1) / columnCount}px)`,
                  height: itemHeight,
                }}
              >
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default {
  VirtualList,
  useVirtualScroll,
  VirtualTable,
  DynamicVirtualList,
  VirtualGrid,
};
