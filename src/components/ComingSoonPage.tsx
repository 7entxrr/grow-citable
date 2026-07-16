"use client";
import React from "react";
import { PhasePageShell } from "@/components/PhasePageShell";

interface ComingSoonPageProps {
  phase: number;
  title: string;
  badgeLabel: string;
  badgeIcon: React.ReactNode;
  accentColor: string;
  features: { icon: React.ReactNode; label: string }[];
}

export function ComingSoonPage({ phase, title, badgeLabel, badgeIcon, accentColor, features }: ComingSoonPageProps) {
  return (
    <PhasePageShell phase={phase} title={title} badgeLabel={badgeLabel} badgeIcon={badgeIcon} accentColor={accentColor}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "64px 24px", textAlign: "center",
        background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8",
        boxShadow: "0 2px 12px rgba(25,24,22,0.04)",
      }}>
        <div style={{ position: "relative", width: 80, height: 80, marginBottom: 28 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `${accentColor}20`,
            animation: "pulseBig 2s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: 10, borderRadius: "50%",
            background: `${accentColor}30`,
            animation: "pulseBig 2s ease-in-out infinite 0.3s",
          }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32,
          }}>
            {badgeIcon}
          </div>
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 14px", borderRadius: 999, marginBottom: 16,
          background: `${accentColor}18`, border: `1px solid ${accentColor}33`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, display: "inline-block", animation: "breathe 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Coming Soon
          </span>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#191816", marginBottom: 10 }}>Phase {phase} is in development</h2>
        <p style={{ fontSize: 14, color: "#888", maxWidth: 420, lineHeight: 1.7 }}>
          This module is currently being built. Here's what it will include when it launches:
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 28 }}>
          {features.map(f => (
            <div key={f.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 10,
              background: "#FAFAF9", border: "1px solid #F0EDE8",
              fontSize: 13, fontWeight: 600, color: "#555",
            }}>
              <span>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes pulseBig { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.15);opacity:1} }
        @keyframes breathe { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>
    </PhasePageShell>
  );
}
