'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './CustomerHabits.module.css';

interface ChartDataPoint {
  month: string;
  seen: number;
  sales: number;
  seenRaw: string;
  salesRaw: string;
}

export default function CustomerHabits() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState('This year');

  const data: ChartDataPoint[] = [
    { month: 'Jan', seen: 28000, sales: 21000, seenRaw: '28.140', salesRaw: '21.050' },
    { month: 'Feb', seen: 52000, sales: 34000, seenRaw: '52.390', salesRaw: '34.201' },
    { month: 'Mar', seen: 20000, sales: 38000, seenRaw: '20.114', salesRaw: '38.003' },
    { month: 'Apr', seen: 43787, sales: 39784, seenRaw: '43.787', salesRaw: '39.784' },
    { month: 'May', seen: 32000, sales: 16000, seenRaw: '32.080', salesRaw: '16.102' },
    { month: 'Jun', seen: 48000, sales: 36000, seenRaw: '48.112', salesRaw: '36.009' },
    { month: 'Jul', seen: 25000, sales: 42000, seenRaw: '25.990', salesRaw: '42.140' }
  ];

  // SVG Chart Dimensions
  const width = 560;
  const height = 220;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value for Y scale
  const maxValue = 60000;

  // Y Helper
  const getY = (val: number) => {
    return chartHeight + paddingTop - (val / maxValue) * chartHeight;
  };

  // Grid lines
  const gridLines = [0, 10000, 20000, 40000, 60000];

  // Column width calculations
  const colCount = data.length;
  const colWidth = chartWidth / colCount;
  const barWidth = 14;
  const barGap = 6;
  const radius = 6;

  // Generate top-rounded SVG path for bars
  const getRoundedBarPath = (x: number, y: number, w: number, h: number, r: number) => {
    // Prevent drawing negative heights or radii larger than height
    const actualHeight = Math.max(0, h);
    const actualRadius = Math.min(r, actualHeight, w / 2);
    
    if (actualHeight === 0) return '';
    if (actualRadius === 0) {
      return `M ${x} ${y + actualHeight} V ${y} H ${x + w} V ${y + actualHeight} Z`;
    }
    
    return `
      M ${x} ${y + actualHeight}
      V ${y + actualRadius}
      A ${actualRadius} ${actualRadius} 0 0 1 ${x + actualRadius} ${y}
      H ${x + w - actualRadius}
      A ${actualRadius} ${actualRadius} 0 0 1 ${x + w} ${y + actualRadius}
      V ${y + actualHeight}
      Z
    `;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Customer Habits</h3>
          <p className={styles.subtitle}>Track your customer habits</p>
        </div>

        <div className={styles.controls}>
          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotSeen}`}></span>
              <span>Seen product</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotSales}`}></span>
              <span>Sales</span>
            </div>
          </div>

          {/* Timeframe Dropdown */}
          <button className={styles.dropdown}>
            <span>{timeRange}</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Chart Plot Area */}
      <div className={styles.chartWrapper}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
          {/* Y Axis Grid Lines & Labels */}
          {gridLines.map((val) => {
            const yPos = getY(val);
            const displayLabel = val === 0 ? '0K' : `${val / 1000}K`;
            return (
              <g key={val} className={styles.gridGroup}>
                <text 
                  x={paddingLeft - 10} 
                  y={yPos + 4} 
                  className={styles.yLabel}
                >
                  {displayLabel}
                </text>
                <line 
                  x1={paddingLeft} 
                  y1={yPos} 
                  x2={width - paddingRight} 
                  y2={yPos} 
                  className={styles.gridLine}
                />
              </g>
            );
          })}

          {/* Bars and X Labels */}
          {data.map((item, index) => {
            const colCenterX = paddingLeft + (index * colWidth) + (colWidth / 2);
            
            // X coordinates for the two bars
            const seenX = colCenterX - barWidth - (barGap / 2);
            const salesX = colCenterX + (barGap / 2);

            // Y and height coordinates
            const seenY = getY(item.seen);
            const seenH = (item.seen / maxValue) * chartHeight;

            const salesY = getY(item.sales);
            const salesH = (item.sales / maxValue) * chartHeight;

            const isHovered = hoveredIndex === index;

            return (
              <g key={item.month} className={styles.barGroup}>
                {/* Seen Product Bar (Grey) */}
                <path
                  d={getRoundedBarPath(seenX, seenY, barWidth, seenH, radius)}
                  className={`${styles.barSeen} ${isHovered ? styles.barHovered : ''}`}
                />
                
                {/* Sales Bar (Blue) */}
                <path
                  d={getRoundedBarPath(salesX, salesY, barWidth, salesH, radius)}
                  className={`${styles.barSales} ${isHovered ? styles.barHovered : ''}`}
                />

                {/* X Axis Label */}
                <text
                  x={colCenterX}
                  y={height - 10}
                  className={`${styles.xLabel} ${isHovered ? styles.xLabelActive : ''}`}
                >
                  {item.month}
                </text>

                {/* Interactive Overlay Column for Hover trigger */}
                <rect
                  x={paddingLeft + (index * colWidth)}
                  y={paddingTop}
                  width={colWidth}
                  height={chartHeight}
                  fill="transparent"
                  className={styles.hitbox}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip HTML Overlay */}
        {hoveredIndex !== null && (() => {
          const item = data[hoveredIndex];
          const colCenterX = paddingLeft + (hoveredIndex * colWidth) + (colWidth / 2);
          
          // Calculate tooltip center position
          // Align relative to parent width percentage
          const pctLeft = (colCenterX / width) * 100;
          
          // Use April's height for anchor
          const anchorY = getY(Math.max(item.seen, item.sales)) - 10;
          
          return (
            <div 
              className={styles.tooltip}
              style={{ 
                left: `${pctLeft}%`,
                top: `${anchorY}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className={styles.tooltipItem}>
                <span className={`${styles.tooltipDot} ${styles.tooltipDotSeen}`}></span>
                <span className={styles.tooltipValue}>{item.seenRaw} Products</span>
              </div>
              <div className={styles.tooltipItem}>
                <span className={`${styles.tooltipDot} ${styles.tooltipDotSales}`}></span>
                <span className={styles.tooltipValue}>{item.salesRaw} Products</span>
              </div>
              <div className={styles.tooltipArrow}></div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
