'use client';

import React from 'react';
import { ChevronDown, Tv, Gamepad2, Sofa } from 'lucide-react';
import styles from './ProductStatistics.module.css';

interface StatItem {
  id: string;
  name: string;
  value: string;
  percentage: number;
  color: string;
  icon: React.ElementType;
}

export default function ProductStatistics() {
  const stats: StatItem[] = [
    { id: 'electronic', name: 'Electronic', value: '2.487', percentage: 1.8, color: '#4B61EC', icon: Tv },
    { id: 'games', name: 'Games', value: '1.828', percentage: 2.3, color: '#4EA8DE', icon: Gamepad2 },
    { id: 'furniture', name: 'Furniture', value: '1.463', percentage: -1.04, color: '#FF5959', icon: Sofa },
  ];

  // Concentric circle variables
  const center = 90;
  const rings = [
    { id: 'electronic', r: 72, color: '#4B61EC', val: 0.78 }, // 78% full
    { id: 'games', r: 56, color: '#3A9FE6', val: 0.62 },      // 62% full
    { id: 'furniture', r: 40, color: '#FF5959', val: 0.45 },  // 45% full
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Product Statistic</h3>
          <p className={styles.subtitle}>Track your product sales</p>
        </div>
        <button className={styles.dropdown}>
          <span>Today</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Visual Chart Area */}
      <div className={styles.chartWrapper}>
        <div className={styles.svgContainer}>
          <svg width="180" height="180" viewBox="0 0 180 180" className={styles.svg}>
            {rings.map((ring) => {
              const circ = 2 * Math.PI * ring.r;
              // We leave a 90 degree gap, so maximum sweep is 270 degrees (3/4 of circle)
              const maxSweep = circ * 0.75;
              const strokeDasharray = `${circ}`;
              // Sweep value proportional to progress
              const strokeDashoffset = circ - (maxSweep * ring.val);
              // Rotate by 135deg so the gap is centered at the bottom
              const rotation = -225;

              return (
                <g key={ring.id}>
                  {/* Background Track */}
                  <circle
                    cx={center}
                    cy={center}
                    r={ring.r}
                    fill="transparent"
                    stroke="#EAEBF2"
                    strokeWidth="8"
                    strokeDasharray={`${maxSweep} ${circ - maxSweep}`}
                    strokeLinecap="round"
                    transform={`rotate(${rotation} ${center} ${center})`}
                  />
                  {/* Active Value Arc */}
                  <circle
                    cx={center}
                    cy={center}
                    r={ring.r}
                    fill="transparent"
                    stroke={ring.color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(${rotation} ${center} ${center})`}
                    className={styles.arc}
                  />
                </g>
              );
            })}
          </svg>

          {/* Central Text Panel */}
          <div className={styles.centerText}>
            <span className={styles.totalValue}>9.829</span>
            <span className={styles.totalLabel}>Products Sales</span>
            <span className={styles.totalBadge}>+5.34%</span>
          </div>
        </div>
      </div>

      {/* Categories breakdown list */}
      <div className={styles.list}>
        {stats.map((item) => {
          const IconComponent = item.icon;
          const isPositive = item.percentage >= 0;
          const badgeText = `${isPositive ? '+' : ''}${item.percentage}%`;

          return (
            <div key={item.id} className={styles.listItem}>
              <div className={styles.categoryInfo}>
                <div className={styles.iconBox} style={{ color: item.color, backgroundColor: `${item.color}12` }}>
                  <IconComponent size={16} />
                </div>
                <span className={styles.categoryName}>{item.name}</span>
              </div>
              
              <div className={styles.categoryValueArea}>
                <span className={styles.categoryValue}>{item.value}</span>
                <span className={`${styles.badge} ${isPositive ? styles.positive : styles.negative}`}>
                  {badgeText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
