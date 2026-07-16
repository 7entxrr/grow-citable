'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './CustomerGrowth.module.css';

interface CountryItem {
  code: string;
  name: string;
  flag: string;
  value: string;
  percentage: number; // For progress bar
}

export default function CustomerGrowth() {
  const countries: CountryItem[] = [
    { code: 'US', name: 'United States', flag: '🇺🇸', value: '2.417', percentage: 100 },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', value: '2.281', percentage: 94 },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', value: '812', percentage: 33 },
    { code: 'FR', name: 'France', flag: '🇫🇷', value: '287', percentage: 12 },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Customer Growth</h3>
          <p className={styles.subtitle}>Track customer by locations</p>
        </div>
        <button className={styles.dropdown}>
          <span>Today</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Content Area (Left: Bubble chart, Right: Country list) */}
      <div className={styles.content}>
        {/* Overlapping Bubbles Visualizer */}
        <div className={styles.bubbleWrapper}>
          <svg viewBox="0 0 170 170" width="100%" height="100%" className={styles.svg}>
            {/* Bubble 4 (FR - 287) */}
            <circle cx="45" cy="50" r="22" className={styles.bubbleFR} />
            <text x="45" y="53" className={styles.bubbleText}>287</text>
            
            {/* Bubble 3 (AU - 812) */}
            <circle cx="120" cy="110" r="26" className={styles.bubbleAU} />
            <text x="120" y="113" className={styles.bubbleText}>812</text>

            {/* Bubble 2 (DE - 2.281) */}
            <circle cx="50" cy="115" r="32" className={styles.bubbleDE} />
            <text x="50" y="118" className={styles.bubbleTextLarge}>2.281</text>

            {/* Bubble 1 (US - 2.417) - Primary on top */}
            <circle cx="95" cy="72" r="36" className={styles.bubbleUS} />
            <text x="95" y="75" className={styles.bubbleTextLarge}>2.417</text>
          </svg>
        </div>

        {/* Country Progress List */}
        <div className={styles.list}>
          {countries.map((item) => (
            <div key={item.code} className={styles.listItem}>
              <div className={styles.countryInfo}>
                <span className={styles.flag} role="img" aria-label={item.name}>
                  {item.flag}
                </span>
                <div className={styles.details}>
                  <div className={styles.nameRow}>
                    <span className={styles.countryName}>{item.name}</span>
                    <span className={styles.countryValue}>{item.value}</span>
                  </div>
                  {/* Progress bar indicator */}
                  <div className={styles.progressTrack}>
                    <div 
                      className={styles.progressBar} 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
