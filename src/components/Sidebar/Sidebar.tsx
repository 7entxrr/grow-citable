'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import {
  CircleDot,
  Search,
  Sparkles,
  LayoutDashboard,
  Lock,
  Flame,
  Globe,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  Users,
  Terminal,
  Trophy,
  BookOpen,
  Cpu,
  Network,
  Link2,
  TrendingUp,
  FolderOpen,
  Bug,
  PenLine,
  Dna,
  Zap,
  Activity,
  ShieldCheck,
  Mic,
  ShoppingBag,
} from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [userPlan, setUserPlan] = useState<string>('Free');
  const [tokensCount, setTokensCount] = useState<number>(10);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 992);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const phases = [
    { num: 1, label: 'Crawl Audit', tag: 'SEO', href: '/phase-1', icon: Search },
    { num: 2, label: 'AI Visibility', tag: 'AEO', href: '/phase-2', icon: Eye },
    { num: 3, label: 'Prompt Explorer', tag: 'AEO', href: '/phase-3', icon: Terminal },
    { num: 4, label: 'AI Benchmarking', tag: 'AEO', href: '/phase-4', icon: Trophy },
    { num: 5, label: 'Content Engine', tag: 'AEO', href: '/phase-5', icon: BookOpen },
    { num: 6, label: 'Entity Engine', tag: 'GEO', href: '/phase-6', icon: Cpu },
    { num: 7, label: 'Semantic Graph', tag: 'GEO', href: '/phase-7', icon: Network },
    { num: 9, label: 'Answer Engine Sim', tag: 'GEO', href: '/phase-9', icon: Sparkles },
    { num: 18, label: 'Source Credibility', tag: 'GEO', href: '/phase-18', icon: ShieldCheck },
    { num: 20, label: 'Voice Search Sim', tag: 'GEO', href: '/phase-20', icon: Mic },
    { num: 8, label: 'Citation Optimizer', tag: 'AEO', href: '/phase-8', icon: Link2 },
    { num: 10, label: 'Backlinks', tag: 'SEO', href: '/phase-10', icon: Link2 },
    { num: 11, label: 'Rank Tracker', tag: 'SEO', href: '/phase-11', icon: TrendingUp },
    { num: 12, label: 'On-Page SEO', tag: 'SEO', href: '/phase-12', icon: FolderOpen },
    { num: 13, label: 'Authority', tag: 'SEO', href: '/phase-13', icon: Trophy },
    { num: 14, label: 'Crawler', tag: 'SEO', href: '/phase-14', icon: Bug },
    { num: 15, label: 'Spelling', tag: 'SEO', href: '/phase-15', icon: PenLine },
    { num: 16, label: 'Redirect Tracer', tag: 'SEO', href: '/redirect-tracer', icon: Dna },
    { num: 19, label: 'Image Auditor', tag: 'SEO', href: '/image-auditor', icon: Zap },
  ];

  useEffect(() => {
    const isMin = typeof window !== 'undefined' ? localStorage.getItem('dealdeck_sidebar_minimized') === 'true' : false;
    setIsMinimized(isMin);
    if (isMin && window.innerWidth > 992) {
      document.body.classList.add('sidebar-minimized');
    } else if (isMin && window.innerWidth <= 992) {
      document.body.classList.remove('sidebar-minimized');
    } else {
      document.body.classList.remove('sidebar-minimized');
    }

    let unsubUserDoc: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Real-time Firestore sync
        unsubUserDoc = onSnapshot(doc(db, 'users', u.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setSubscribed(data.subscribed === true);
            setUserPlan(data.plan || 'Free');
            
            if (data.tokens === undefined) {
              let tokens = 10;
              if (data.subscribed === true && data.plan) {
                const lowerPlan = data.plan.toLowerCase();
                if (lowerPlan === 'starter') tokens = 300;
                else if (lowerPlan === 'growth') tokens = 600;
                else if (lowerPlan === 'ultra') tokens = 1000;
              }
              await updateDoc(doc(db, 'users', u.uid), { tokens }).catch(() => {});
              setTokensCount(tokens);
            } else {
              setTokensCount(data.tokens);
            }
          } else {
            setSubscribed(false);
            setUserPlan('Free');
            setTokensCount(10);
          }
        }, () => {
          setSubscribed(false);
          setUserPlan('Free');
          setTokensCount(10);
        });

        // Background sync with Paddle API for full subscription details
        fetch(`/api/subscription?userId=${u.uid}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.subscription && (data.subscription.status === 'active' || data.subscription.status === 'canceling')) {
              setSubscribed(true);
            } else {
              setSubscribed(false);
            }
          })
          .catch(() => {});
      } else {
        setSubscribed(false);
        setUserPlan('Free');
        setTokensCount(10);
      }
    });
    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const toggleMinimize = () => {
    if (window.innerWidth <= 992) {
      setMobileOpen(!mobileOpen);
      return;
    }
    const nextVal = !isMinimized;
    setIsMinimized(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dealdeck_sidebar_minimized', String(nextVal));
      if (nextVal) {
        document.body.classList.add('sidebar-minimized');
      } else {
        document.body.classList.remove('sidebar-minimized');
      }
    }
  };

  const [activeTab, setActiveTab] = useState('SEO');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let initialTab = 'SEO';
      const match = pathname ? pathname.match(/\/phase-(\d+)/) : null;
      if (match) {
        const phase = phases.find((p) => p.num === parseInt(match[1]));
        if (phase) {
          initialTab = phase.tag;
        }
      } else {
        const cachedTab = sessionStorage.getItem('dealdeck_active_tab');
        if (cachedTab) {
          initialTab = cachedTab;
        }
      }
      setActiveTab(initialTab);
    }
  }, [pathname]);

  let activeItem = 'Dashboard';
  if (pathname === '/settings') {
    activeItem = 'Settings';
  } else if (pathname === '/phase-2') {
    activeItem = 'AI Visibility';
  } else if (pathname === '/ai-visibility-tasks') {
    activeItem = 'AI Visibility Tasks';
  } else if (pathname === '/ai-visibility-team') {
    activeItem = 'AI Visibility Team';
  } else if (pathname === '/ai-shopping') {
    activeItem = 'AI Shopping Visibility';
  } else if (pathname) {
    const matchedPhase = phases.find((p) => p.href === pathname);
    if (matchedPhase) {
      activeItem = matchedPhase.label;
    } else {
      const match = pathname.match(/\/phase-(\d+)/);
      if (match) {
        const phaseNum = parseInt(match[1]);
        if (phaseNum === 1) {
          activeItem = 'Crawl Audit';
        }
      }
    }
  }

  return (
    <>
      <style>{`@keyframes slowSpin { to { transform: rotate(360deg); } } @keyframes pulseGlow { 0% { box-shadow: 0 2px 4px rgba(255, 75, 43, 0.2); opacity: 0.95; } 100% { box-shadow: 0 2px 10px rgba(255, 75, 43, 0.6); opacity: 1; } }`}</style>
      <aside className={`${styles.sidebar} ${isMinimized && !isMobile ? styles.minimized : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
      <div className={styles.brand}>
        {(!isMinimized || isMobile) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={24} height={24} style={{ borderRadius: '6px', objectFit: 'contain' }} />
            <span className={styles.brandName}>Grow Citable</span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={toggleMinimize}
            className={styles.brandCollapseBtn}
            title={isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isMinimized ? (
              <PanelLeftOpen size={20} className={styles.icon} />
            ) : (
              <PanelLeftClose size={20} className={styles.icon} />
            )}
          </button>
        )}
      </div>

      {isMobile && (
        <button
          onClick={toggleMinimize}
          className={styles.brandCollapseBtn}
          title={mobileOpen ? "Close Menu" : "Open Menu"}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      )}

      {!isMobile && (
        <div className={styles.searchBar}>
          <Search size={20} className={styles.searchIcon} />
          <span className={`${styles.searchText} ${styles.label}`}>Search...</span>
          <div className={`${styles.searchShortcut} ${styles.label}`}>
            <span className={styles.searchKbd}>⌘</span>
            <span className={styles.searchKbd}>K</span>
          </div>
        </div>
      )}

      <nav className={styles.nav} style={{ color: '#FFFFFF' }}>
        <div className={styles.slideTabs}>
          {['SEO', 'AEO', 'GEO'].map((tab) => (
            <button
              key={tab}
              className={`${styles.slideTab} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => {
                setActiveTab(tab);
                sessionStorage.setItem('dealdeck_active_tab', tab);
              }}
            >
              {tab === 'GEO' && (
                <Flame
                  size={12}
                  style={{
                    marginRight: '4px',
                    display: 'inline-block',
                    verticalAlign: 'text-bottom',
                    color: activeTab === 'GEO' ? '#FFFFFF' : 'var(--primary-blue)',
                    fill: activeTab === 'GEO' ? '#FFFFFF' : 'var(--primary-blue)',
                  }}
                />
              )}
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.section}>
          <ul className={styles.itemList}>
            <li>
              <Link
                href="/dashboard"
                className={`${styles.itemButton} ${activeItem === 'Dashboard' ? styles.active : ''}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LayoutDashboard size={20} className={styles.icon} />
                  <span className={styles.label}>Dashboard</span>
                </div>
                {(!isMinimized || isMobile) && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'rgba(245,158,11,0.18)', 
                    padding: '4px 12px', 
                    borderRadius: '14px', 
                    fontSize: '13px',
                    fontWeight: '850',
                    color: '#fbbf24'
                  }}>
                    <Image
                      src="/favicon/logo-white2.png"
                      alt="Token"
                      width={15}
                      height={15}
                      style={{ objectFit: 'contain' }}
                    />
                    <span>{tokensCount.toLocaleString()}</span>
                  </div>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/phase-1"
                className={`${styles.itemButton} ${activeItem === 'Crawl Audit' ? styles.active : ''}`}
              >
                <Search size={20} className={styles.icon} />
                <span className={styles.label}>Crawl Audit</span>
              </Link>
            </li>

            <li>
              <Link
                href={userPlan.toLowerCase() === 'free' ? '#!' : '/ai-visibility-tasks'}
                className={`${styles.itemButton} ${activeItem === 'AI Visibility Tasks' ? styles.active : ''}`}
                onClick={(e) => { if (userPlan.toLowerCase() === 'free') e.preventDefault(); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={20} height={20} style={{ borderRadius: 4, objectFit: "contain", animation: "slowSpin 4s linear infinite" }} />
                  <span className={styles.label}>AI Visibility Tasks</span>
                </div>
                {userPlan.toLowerCase() === 'free' && <Lock size={14} className={styles.lockIcon} />}
              </Link>
            </li>
            <li>
              <Link
                href={userPlan.toLowerCase() !== 'ultra' ? '#!' : '/ai-visibility-team'}
                className={`${styles.itemButton} ${activeItem === 'AI Visibility Team' ? styles.active : ''}`}
                onClick={(e) => { if (userPlan.toLowerCase() !== 'ultra') e.preventDefault(); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} className={styles.icon} />
                  <span className={styles.label}>AI Visibility Team</span>
                </div>
                {userPlan.toLowerCase() !== 'ultra' && <Lock size={14} className={styles.lockIcon} />}
              </Link>
            </li>
            <li>
              <Link
                href="/ai-shopping"
                className={`${styles.itemButton} ${activeItem === 'AI Shopping Visibility' ? styles.active : ''}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={20} className={styles.icon} />
                  <span className={styles.label}>AI Shopping Visibility</span>
                </div>
                {(!isMinimized || isMobile) && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2.5px',
                    fontSize: '9px',
                    fontWeight: 900,
                    color: '#FFF',
                    background: 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    animation: 'pulseGlow 1.2s infinite alternate ease-in-out',
                    WebkitFontSmoothing: 'antialiased',
                    backfaceVisibility: 'hidden',
                  }}>
                    <Flame size={10} style={{ fill: '#FFF', stroke: 'none' }} />
                    HOT
                  </span>
                )}
              </Link>
            </li>
          </ul>
        </div>

        {phases.filter((phase) => phase.tag === activeTab && phase.num !== 1).length > 0 && (
          <>
            <div className={styles.divider} />
            <div className={styles.section}>
              <h3 className={`${styles.sectionTitle} ${styles.label}`}>Tools</h3>
              <ul className={styles.itemList}>
                {phases.filter((phase) => phase.tag === activeTab && phase.num !== 1).map((phase) => {
                  const isLocked = (() => {
                    if (phase.tag === 'SEO') return false;
                    const plan = userPlan.toLowerCase();
                    if (plan === 'free') return true;
                    if (plan === 'starter' && phase.tag === 'GEO') return true;
                    return false;
                  })();
                  const isActive = activeItem === phase.label;
                  const Icon = phase.icon;
                  return (
                    <li key={phase.num}>
                      <Link
                        href={isLocked ? '#!' : phase.href}
                        className={`${styles.itemButton} ${isActive ? styles.active : ''}`}
                        onClick={(e) => { if (isLocked) e.preventDefault(); }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={18} className={styles.icon} />
                          <span className={styles.label}>{phase.label}</span>
                        </div>
                        {isLocked && <Lock size={14} className={styles.lockIcon} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
        {/* Mobile-only Settings Link at the bottom of the drawer */}
        {isMobile && subscribed === false && (
          <Link href="/pricing" style={{ textDecoration: 'none', display: 'block', margin: '16px 12px 12px 12px' }}>
            <div className={styles.upgradeCard} style={{ margin: 0 }}>
              <div className={styles.upgradeHeader}>
                <div className={styles.upgradeIconWrapper}>
                  <Sparkles size={16} className={styles.upgradeIcon} />
                </div>
                <span className={styles.upgradeTitle}>Boost with AI</span>
              </div>
              <p className={styles.upgradeText}>
                AI-powered audits, tag insights, and tools that save hours.
              </p>
              <button className={styles.upgradeButton}>Upgrade to Pro</button>
            </div>
          </Link>
        )}
        {isMobile && (
          <div className={styles.mobileOnlySettings}>
            <div className={styles.divider} />
            <Link
              href="/settings"
              className={styles.itemButton}
              style={{ width: '100%', margin: 0 }}
            >
              <Settings size={20} className={styles.icon} />
              <span className={styles.label}>Settings</span>
            </Link>
          </div>
        )}
      </nav>

      {!isMobile && subscribed === false && (
        <Link href="/pricing" style={{ textDecoration: 'none' }}>
          <div className={styles.upgradeCard}>
            <div className={styles.upgradeHeader}>
              <div className={styles.upgradeIconWrapper}>
                <Sparkles size={16} className={styles.upgradeIcon} />
              </div>
              <span className={styles.upgradeTitle}>Boost with AI</span>
            </div>
            <p className={styles.upgradeText}>
              AI-powered audits, tag insights, and tools that save hours.
            </p>
            <button className={styles.upgradeButton}>Upgrade to Pro</button>
          </div>
        </Link>
      )}

      {!isMobile && (
        <div className={styles.profileCard}>
          <Link
            href="/settings"
            className={styles.itemButton}
            style={{ width: '100%', margin: 0 }}
          >
            <Settings size={20} className={styles.icon} />
            <span className={styles.label}>Settings</span>
          </Link>
        </div>
      )}
    </aside>
    </>
  );
}
