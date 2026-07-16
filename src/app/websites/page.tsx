'use client';

import React from 'react';
import { useAuthGuard } from '@/lib/useAuthGuard';
import Sidebar from '@/components/Sidebar/Sidebar';
import styles from '../page.module.css';
import Link from 'next/link';
import { Globe, Search, ArrowRight } from 'lucide-react';

export default function WebsitesPage() {
  const { loading } = useAuthGuard();

  if (loading) return null;

  // Static list of audited domains for illustration/navigation matching user scans
  const websites = [
    {
      domain: 'vazautosolutions.com',
      title: 'Vaz Auto Solutions',
      pagesCrawled: 43,
      status: 'good',
      lastScanned: 'Just now',
    },
  ];

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper} style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
          
          {/* Header */}
          <header className={styles.header} style={{ marginBottom: '40px' }}>
            <div className={styles.titleArea}>
              <h1 className={styles.title} style={{ fontSize: '28px', fontWeight: 500, fontFamily: 'var(--font-kumbh-sans)' }}>Websites</h1>
              <p className={styles.subtitle} style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 300 }}>
                Manage scanned domains and view core discovery crawl directories
              </p>
            </div>
          </header>

          {/* Websites Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {websites.map((web) => (
              <div
                key={web.domain}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 12px rgba(25, 24, 22, 0.03)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(217, 107, 67, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-blue)',
                    }}
                  >
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 500, margin: 0, color: 'var(--text-dark)' }}>{web.domain}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{web.title}</p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderTop: '1px dashed var(--border-color)',
                    borderBottom: '1px dashed var(--border-color)',
                    marginBottom: '20px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Pages Crawled:</span>
                  <strong style={{ color: 'var(--text-dark)', fontWeight: 500 }}>{web.pagesCrawled}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last Scan: {web.lastScanned}</span>
                  <Link href="/phase-1" style={{ textDecoration: 'none' }}>
                    <button
                      style={{
                        background: 'var(--primary-blue)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 450,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'opacity 0.2s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <span>Crawl Audit</span>
                      <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>
              </div>
            ))}

            {/* Run Audit CTA Card */}
            <div
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: '200px',
                background: 'rgba(243, 239, 233, 0.25)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  marginBottom: '16px',
                }}
              >
                <Search size={20} />
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 6px 0', color: 'var(--text-dark)' }}>Audit Another Website</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0', maxWidth: '240px', lineHeight: '1.4' }}>
                Analyze another web property for crawl depth and LLM entity connections.
              </p>
              <Link href="/phase-1" style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-dark)',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 450,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-sidebar)')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  New Scan
                </button>
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
