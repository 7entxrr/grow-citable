import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "@/app/page.module.css";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";

/* ── Icons ── */
function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/* ── Types ── */
interface PhasePageShellProps {
  phase: number;
  title: string;
  badgeLabel: string;
  badgeIcon?: React.ReactNode;
  accentColor?: string;         // hex, default = #D96B43 (clay)
  onExport?: () => void;
  hasResults?: boolean;
  children: React.ReactNode;
}

const isPhaseLocked = (phase: number, plan: string) => {
  const normalizedPlan = plan.toLowerCase();
  
  // SEO phases are always unlocked
  const seoPhases = [1, 10, 11, 12, 13, 14, 15, 16, 19];
  if (seoPhases.includes(phase)) return false;
  
  // AEO phases: 2, 3, 4, 5, 8
  const aeoPhases = [2, 3, 4, 5, 8];
  
  // GEO phases: 6, 7, 9, 18, 20
  const geoPhases = [6, 7, 9, 18, 20];
  
  if (normalizedPlan === 'free') {
    if (aeoPhases.includes(phase) || geoPhases.includes(phase)) return true;
  }
  
  if (normalizedPlan === 'starter') {
    if (geoPhases.includes(phase)) return true;
  }
  
  return false;
};

/* ── Main ── */
export function PhasePageShell({
  phase,
  title,
  badgeLabel,
  badgeIcon,
  accentColor = "#D96B43",
  onExport,
  hasResults,
  children,
}: PhasePageShellProps) {
  const [userPlan, setUserPlan] = useState<string>("Free");
  const [checkingPlan, setCheckingPlan] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        const docRef = doc(db, "users", u.uid);
        const unsubDoc = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            setUserPlan(snap.data().plan || "Free");
          } else {
            setUserPlan("Free");
          }
          setCheckingPlan(false);
        });
        return () => unsubDoc();
      } else {
        setUserPlan("Free");
        setCheckingPlan(false);
      }
    });
    return () => unsub();
  }, []);

  const geoPhases = [6, 7, 9, 18, 20];
  const locked = !checkingPlan && isPhaseLocked(phase, userPlan);

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>

          {/* ══ Hero Header ══ */}
          <header
            className="phase-page-header"
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "36px 40px",
              marginBottom: 28,
              border: "1px solid #f0f0f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                {/* Pill badge */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 12px", borderRadius: 999,
                  background: "#f5f5f5",
                  border: "1px solid #e5e5e5",
                  marginBottom: 14,
                }}>
                  {badgeIcon && <span style={{ display: "flex", fontSize: 13, color: "#000" }}>{badgeIcon}</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#000" }}>
                    Phase {phase} · {badgeLabel}
                  </span>
                </div>

                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#000", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  {title}
                </h1>

              </div>

              {/* Export button */}
              {hasResults && onExport && (
                <button
                  type="button"
                  onClick={onExport}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "9px 18px",
                    borderRadius: 10,
                    border: "1px solid #e5e5e5",
                    background: "#fff",
                    color: "#000",
                    fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
                >
                  <DownloadIcon />
                  Export JSON
                </button>
              )}
            </div>
          </header>

          {/* ══ Page Content ══ */}
          {locked ? (
            <div style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(229,229,229,0.5)",
              borderRadius: 20,
              padding: "60px 40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "400px",
              marginTop: 20
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(217, 107, 67, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                color: "#D96B43"
              }}>
                <Lock size={28} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#191816", margin: "0 0 10px 0" }}>
                Upgrade Plan to Unlock
              </h2>
              <p style={{ fontSize: 15, color: "#5C544E", maxWidth: 440, margin: "0 0 24px 0", lineHeight: 1.5 }}>
                This is a {geoPhases.includes(phase) ? "GEO (Generative Engine Optimization)" : "AEO (Answer Engine Optimization)"} feature. 
                {userPlan.toLowerCase() === 'starter' 
                  ? "Upgrade to Growth or Ultra to unlock full AEO + GEO auditing." 
                  : "Upgrade your subscription to get access to advanced AEO & GEO tools."}
              </p>
              <Link href="/pricing" style={{ textDecoration: 'none' }}>
                <button style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#D96B43",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(217, 107, 67, 0.2)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(217, 107, 67, 0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(217, 107, 67, 0.2)"; }}
                >
                  <Sparkles size={16} />
                  <span>View Pricing & Upgrade</span>
                </button>
              </Link>
            </div>
          ) : (
            children
          )}

        </div>
      </main>
    </div>
  );
}

/* ── Reusable Form Card ── */
export function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="phase-form-card" style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #F0EDE8",
      padding: "32px",
      boxShadow: "0 2px 12px rgba(25,24,22,0.05)",
    }}>
      {children}
    </div>
  );
}

export function InfoCard({ icon, title, body, footer }: { icon: React.ReactNode; title: string; body: string; footer?: React.ReactNode }) {
  return (
    <div className="phase-info-card" style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #F0EDE8",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      boxShadow: "0 2px 12px rgba(25,24,22,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 24, display: "flex", flexShrink: 0 }}>{icon}</div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#191816", margin: 0 }}>{title}</p>
      </div>
      <p style={{ fontSize: 12, color: "#888", lineHeight: 1.7, margin: 0 }}>{body}</p>
      {footer && (
        <div style={{ borderTop: "1px solid #F0EDE8", paddingTop: 12 }}>
          {footer}
        </div>
      )}
    </div>
  );
}

/* ── Premium Input ── */
export function PremiumInput({
  label, placeholder, value, onChange, type = "text", hint, icon,
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; hint?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#191816", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </label>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        borderRadius: 10, border: "1.5px solid #E6E1D6",
        background: "#FAFAF9", padding: "0 14px",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
        onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#D96B43"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(217,107,67,0.12)"; }}
        onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E6E1D6"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        {icon && <span style={{ color: "#aaa", display: "flex", flexShrink: 0 }}>{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            padding: "13px 0", fontSize: 14, color: "#191816",
          }}
        />
      </div>
      {hint && <p style={{ fontSize: 11, color: "#aaa", marginTop: 5 }}>{hint}</p>}
    </div>
  );
}

/* ── Premium Textarea ── */
export function PremiumTextarea({
  label, placeholder, value, onChange, rows = 5, hint, counter,
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; rows?: number; hint?: string; counter?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#191816", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </label>
        {counter && <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>{counter}</span>}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%", resize: "vertical", borderRadius: 10,
          border: "1.5px solid #E6E1D6", background: "#FAFAF9",
          padding: "13px 14px", fontSize: 13, fontFamily: "monospace",
          color: "#191816", outline: "none", lineHeight: 1.7,
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxSizing: "border-box",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "#D96B43"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,107,67,0.12)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#E6E1D6"; e.currentTarget.style.boxShadow = "none"; }}
      />
      {hint && <p style={{ fontSize: 11, color: "#aaa", marginTop: 5 }}>{hint}</p>}
    </div>
  );
}

/* ── Submit Button ── */
export function SubmitButton({ loading, label, loadingLabel, tokens }: { loading: boolean; label: string; loadingLabel: string; tokens?: number }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        padding: "12px 32px", borderRadius: 10,
        background: loading ? "#ccc" : "#D96B43",
        border: "none", color: "#fff",
        fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        display: "inline-flex", alignItems: "center", gap: 8,
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#C05730"; }}
      onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#D96B43"; }}
    >
      {loading && (
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.3)",
          borderTopColor: "#fff",
          display: "inline-block",
          animation: "spin 0.7s linear infinite",
        }} />
      )}
      <span>{loading ? loadingLabel : label}</span>
      {!loading && tokens !== undefined && tokens > 0 && (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.22)',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 800,
          color: '#ffffff',
          verticalAlign: 'middle',
        }}>
          <img
            src="/favicon/logo-white2.png"
            alt="Token"
            style={{ width: '12px', height: '12px', objectFit: 'contain' }}
          />
          <span>{tokens}</span>
        </span>
      )}
    </button>
  );
}

/* ── Error Box ── */
export function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      padding: "12px 16px", borderRadius: 10,
      background: "rgba(220,38,38,0.06)",
      border: "1px solid rgba(220,38,38,0.18)",
      color: "#dc2626", fontSize: 13, fontWeight: 500,
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0, verticalAlign: "middle" }}>
        <path d="M12 2L2 22h20L12 2z" />
        <line x1="12" y1="9" x2="12" y2="15" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
      {message}
    </div>
  );
}

/* ── Loading Spinner Card ── */
export function LoadingCard({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 16,
      padding: "60px 20px",
      borderRadius: 16, border: "1px solid #F0EDE8",
      background: "#fff", marginTop: 24, textAlign: "center",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: "3px solid #F0EDE8",
        borderTopColor: "#D96B43",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ fontSize: 13, color: "#888", maxWidth: 360 }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Stat Card ── */
export function StatCard({ label, value, color = "#D96B43" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="phase-stat-card" style={{
      background: "#fff", borderRadius: 16,
      border: "1px solid #F0EDE8", padding: "24px",
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(25,24,22,0.04)",
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 10 }}>
        {label}
      </p>
      <p style={{ fontSize: 38, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

/* ── Result Card (replaces AnalysisCard) ── */
export function ResultCard({ title, children, fullWidth }: { title: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className="phase-result-card" style={{
      background: "#fff", borderRadius: 16,
      border: "1px solid #F0EDE8", padding: "24px",
      boxShadow: "0 2px 8px rgba(25,24,22,0.04)",
      gridColumn: fullWidth ? "1 / -1" : undefined,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 16 }}>
        {title}
      </p>
      {children}
    </div>
  );
}
