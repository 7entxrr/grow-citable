'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  title: string;
  value: string;
  percentage: number;
  badgeText: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary';
}

export default function MetricCard({
  title,
  value,
  percentage,
  badgeText,
  icon: Icon,
  variant = 'default'
}: MetricCardProps) {
  const isPositive = percentage >= 0;
  const formattedPercentage = `${isPositive ? '+' : ''}${percentage}%`;

  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.header}>
        {/* Icon Container */}
        <div className={styles.iconWrapper}>
          <Icon size={20} className={styles.icon} />
        </div>
        
        {/* Growth Badge */}
        <span className={`${styles.badge} ${isPositive ? styles.positive : styles.negative}`}>
          {formattedPercentage}
        </span>
      </div>

      <div className={styles.body}>
        <span className={styles.title}>{title}</span>
        <h2 className={styles.value}>{value}</h2>
        <span className={styles.badgeText}>{badgeText}</span>
      </div>
    </div>
  );
}
