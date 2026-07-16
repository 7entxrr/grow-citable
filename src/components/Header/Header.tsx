'use client';

import React from 'react';
import { Search, Bell } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  title?: string;
  dateText?: string;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

export default function Header({
  title = 'Sales Report',
  dateText = 'Friday, December 15th 2023',
  userName = 'Ferra Alexandra',
  userRole = 'Admin store',
  userAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60'
}: HeaderProps) {
  return (
    <header className={styles.header}>
      {/* Title and Date */}
      <div className={styles.titleContainer}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.date}>{dateText}</p>
      </div>

      {/* Action Buttons and Profile */}
      <div className={styles.actions}>
        <button className={styles.iconButton} aria-label="Search">
          <Search size={18} className={styles.icon} />
        </button>
        
        <button className={styles.iconButton} aria-label="Notifications">
          <Bell size={18} className={styles.icon} />
          <span className={styles.badgeDot}></span>
        </button>

        {/* User Profile */}
        <div className={styles.profile}>
          {/* Avatar Image container */}
          <div className={styles.avatarWrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={userAvatar} 
              alt={userName} 
              className={styles.avatarImage} 
            />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <span className={styles.userRole}>{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
