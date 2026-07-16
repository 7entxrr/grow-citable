"use client";

import React, { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "../page.module.css";
import Image from "next/image";
import { CheckCircle, XCircle, Users, Clock, FileText, ArrowRight, Sparkles, ChevronDown, Send, User, Loader2, Paperclip, X, Lock } from "lucide-react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const card = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #f0f0f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const hours = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const chatMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Hi there! I am your Grow Citable AI assistant. Ask me anything about SEO, AI visibility, schema markup, backlinks, or any of our platform features.",
    timestamp: new Date(),
  },
];

export default function AIVisibilityTeamPage() {
  const [user, setUser] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<string>("Free");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [skipped, setSkipped] = useState(false);
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("17:00");
  const [accepted, setAccepted] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>(chatMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const userDocSnap = await getDoc(doc(db, "users", u.uid));
          if (userDocSnap.exists()) {
            setUserPlan(userDocSnap.data().plan || "Free");
          }
          const docRef = doc(db, "users", u.uid, "visibility_team", "request");
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setTeamName(data.teamName || "");
            setFromTime(data.fromTime || "09:00");
            setToTime(data.toTime || "17:00");
            setSubmitted(true);
            if (data.isPending === false) {
              setShowChat(true);
            }
            if (data.teamName === "Name Your Team") {
              setSkipped(true);
            }
          }
        } catch (e) {
          console.error("Error fetching visibility team request:", e);
        }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || isTyping) return;
    let content = input.trim();
    if (files.length > 0) {
      content += (content ? "\n" : "") + `[Attached: ${files.map(f => f.name).join(", ")}]`;
    }
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setFiles([]);
    setIsTyping(true);

    setTimeout(() => {
      const responses: Record<string, string> = {
        "what is ai visibility": "AI visibility measures how often your brand appears in answers from AI engines like ChatGPT, Claude, Google Gemini, and Perplexity. It depends on structured data, entity authority, and content quality. Our platform helps you audit and improve all three.",
        "how to improve my seo score": "Start with our Crawl & Discovery audit (Phase 1), then work through the AI Visibility Tasks checklist. Key areas: fix broken links, add schema markup, improve readability scores, and build topic authority clusters.",
        "explain schema markup": "Schema markup (JSON-LD) is structured data that helps AI engines understand your content. Types include Organization, LocalBusiness, FAQ, HowTo, and Article schemas. Our tools auto-generate and deploy these for you.",
        "help with backlinks": "Backlinks from authoritative domains are critical for AI citation. Use our Backlinks tool to discover link opportunities, analyze competitor backlinks, and track your domain authority growth over time.",
      };

      const lower = userMsg.content.toLowerCase();
      let reply = "";
      for (const [key, val] of Object.entries(responses)) {
        if (lower.includes(key)) { reply = val; break; }
      }
      if (!reply) {
        reply = "Great question! I recommend running a full site audit first to see where you stand. Then our AI Visibility Tasks will guide you step by step. Would you like me to explain any specific feature in more detail?";
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fromIdx = hours.indexOf(fromTime);
  const toIdx = hours.indexOf(toTime);
  const diff = toIdx - fromIdx;
  const validRange = fromIdx >= 0 && toIdx > fromIdx && diff <= 8;

  const handleRequestSubmit = async () => {
    if (!user) {
      alert("Please log in to submit your team request.");
      return;
    }

    const finalName = skipped || !teamName.trim() ? "Name Your Team" : teamName.trim();
    setLoading(true);

    try {
      const docRef = doc(db, "users", user.uid, "visibility_team", "request");
      await setDoc(docRef, {
        teamName: finalName,
        fromTime,
        toTime,
        requestedAt: new Date().toISOString(),
        isPending: true,
        approvedAt: null,
        updatedAt: new Date().toISOString()
      });

      setSubmitted(true);
    } catch (e) {
      console.error("Error submitting team request:", e);
      alert("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboardContainer} style={{ background: "#F5F5F7", minHeight: "100vh" }}>
        <Sidebar />
        <main className={styles.mainContent}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: '#7C5CFF' }} />
          </div>
        </main>
      </div>
    );
  }

  if (userPlan.toLowerCase() === 'free') {
    return (
      <div className={styles.dashboardContainer}>
        <Sidebar />
        <main className={styles.mainContent}>
          <div className={styles.contentWrapper} style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{
              background: "#fff",
              borderRadius: 20,
              padding: "60px 40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #f0f0f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              maxWidth: 550,
              width: "100%"
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(124, 92, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                color: "#7C5CFF"
              }}>
                <Lock size={28} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#191816", margin: "0 0 10px 0" }}>
                Unlock AI visibility Agent
              </h2>
              <p style={{ fontSize: 15, color: "#5C544E", margin: "0 0 24px 0", lineHeight: 1.5 }}>
                Get custom SEO & visibility specialists assigned directly to your search ranking optimizations. 
                Upgrade to a Starter, Growth, or Ultra subscription to request your AI expert team.
              </p>
              <Link href="/pricing" style={{ textDecoration: 'none' }}>
                <button style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#7C5CFF",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(124, 92, 255, 0.2)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(124, 92, 255, 0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(124, 92, 255, 0.2)"; }}
                >
                  <Sparkles size={16} />
                  <span>View Pricing & Upgrade</span>
                </button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>

          {!showChat && (
          <header className={styles.header}>
            <div className={styles.titleArea}>
              <h1 className={styles.title}>AI Visibility Team</h1>
              <p className={styles.subtitle}>
                Request your dedicated AI ranking specialist team
              </p>
            </div>
          </header>
          )}

          {!submitted && !showChat ? (
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={{ ...card, padding: 32 }}>

                {/* Step indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                  {[1, 2, 3].map(s => (
                    <React.Fragment key={s}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                        background: step >= s ? "#000" : "#f0f0f0",
                        color: step >= s ? "#fff" : "#ccc",
                        transition: "all 0.2s ease",
                      }}>
                        {step > s ? <CheckCircle size={14} /> : s}
                      </div>
                      {s < 3 && <div style={{
                        flex: 1, height: 2, background: step > s ? "#000" : "#f0f0f0",
                        borderRadius: 1, transition: "all 0.2s ease",
                      }} />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Step 1: Team Name */}
                {step === 1 && (
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>
                      Name Your Team
                    </h2>
                    <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px", lineHeight: 1.5 }}>
                      Give your team a name so we can personalize your dashboard. You can skip this and we will use a default.
                    </p>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      borderRadius: 12, border: "1.5px solid #e5e5e5",
                      padding: "0 16px", background: "#fafafa",
                      marginBottom: 20,
                    }}>
                      <Users size={18} style={{ color: "#bbb", flexShrink: 0 }} />
                      <input
                        type="text" value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        placeholder="e.g. SEO Dream Team"
                        style={{
                          flex: 1, background: "transparent", border: "none", outline: "none",
                          padding: "14px 0", fontSize: 15, color: "#1a1a1a",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="button" onClick={() => { setStep(2); }}
                        style={{
                          flex: 1, padding: "12px 20px", borderRadius: 12,
                          background: "#000", color: "#fff", border: "none",
                          fontSize: 14, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Continue
                      </button>
                      <button type="button" onClick={() => { setSkipped(true); setStep(2); }}
                        style={{
                          padding: "12px 20px", borderRadius: 12,
                          background: "#f8f9fa", color: "#666", border: "1.5px solid #e5e5e5",
                          fontSize: 14, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Time Slot */}
                {step === 2 && (
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>
                      Choose Your 8-Hour Shift
                    </h2>
                    <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px", lineHeight: 1.5 }}>
                      Select a time slot when your dedicated specialist will work. Maximum 8 consecutive hours. Pick any window that suits you.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 6 }}>
                          From
                        </label>
                        <div style={{ position: "relative" }}>
                          <button type="button" onClick={() => { setShowFromDropdown(!showFromDropdown); setShowToDropdown(false); }}
                            style={{
                              width: "100%", padding: "12px 14px", borderRadius: 10,
                              border: "1.5px solid #e5e5e5", background: "#fafafa",
                              fontSize: 14, fontWeight: 600, color: "#1a1a1a", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Clock size={16} style={{ color: "#bbb" }} />
                              {fromTime}
                            </div>
                            <ChevronDown size={14} style={{ color: "#999" }} />
                          </button>
                          {showFromDropdown && (
                            <div style={{
                              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                              background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10,
                              marginTop: 4, maxHeight: 200, overflowY: "auto",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                            }}>
                              {hours.map(h => (
                                <button key={h} type="button" onClick={() => { setFromTime(h); setShowFromDropdown(false); }}
                                  style={{
                                    width: "100%", padding: "10px 14px", textAlign: "left",
                                    background: h === fromTime ? "#f5f5f5" : "transparent",
                                    border: "none", fontSize: 14, color: "#1a1a1a", cursor: "pointer",
                                    fontWeight: h === fromTime ? 700 : 400,
                                  }}
                                >{h}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 6 }}>
                          To
                        </label>
                        <div style={{ position: "relative" }}>
                          <button type="button" onClick={() => { setShowToDropdown(!showToDropdown); setShowFromDropdown(false); }}
                            style={{
                              width: "100%", padding: "12px 14px", borderRadius: 10,
                              border: "1.5px solid #e5e5e5", background: "#fafafa",
                              fontSize: 14, fontWeight: 600, color: "#1a1a1a", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Clock size={16} style={{ color: "#bbb" }} />
                              {toTime}
                            </div>
                            <ChevronDown size={14} style={{ color: "#999" }} />
                          </button>
                          {showToDropdown && (
                            <div style={{
                              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                              background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10,
                              marginTop: 4, maxHeight: 200, overflowY: "auto",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                            }}>
                              {hours.map(h => {
                                const hIdx = hours.indexOf(h);
                                const isDisabled = hIdx <= fromIdx;
                                return (
                                  <button key={h} type="button" disabled={isDisabled}
                                    onClick={() => { setToTime(h); setShowToDropdown(false); }}
                                    style={{
                                      width: "100%", padding: "10px 14px", textAlign: "left",
                                      background: h === toTime ? "#f5f5f5" : "transparent",
                                      border: "none", fontSize: 14, cursor: isDisabled ? "not-allowed" : "pointer",
                                      color: isDisabled ? "#ccc" : h === toTime ? "#1a1a1a" : "#1a1a1a",
                                      fontWeight: h === toTime ? 700 : 400,
                                    }}
                                  >{h}</button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      padding: "12px 16px", borderRadius: 12,
                      background: validRange ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${validRange ? "#bbf7d0" : "#fecaca"}`,
                      fontSize: 13, color: validRange ? "#16a34a" : "#dc2626",
                      fontWeight: 600, marginBottom: 24,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      {validRange ? (
                        <>
                          <CheckCircle size={14} />
                          Selected shift: {diff} hour{diff > 1 ? "s" : ""} (from {fromTime} to {toTime})
                        </>
                      ) : (
                        <>
                          <XCircle size={14} />
                          {fromIdx >= toIdx ? "End time must be after start time" : `Selected range is ${diff} hours. Maximum allowed is 8 hours.`}
                        </>
                      )}
                    </div>

                    <button type="button" onClick={() => setStep(3)} disabled={!validRange}
                      style={{
                        width: "100%", padding: "12px 20px", borderRadius: 12,
                        background: validRange ? "#000" : "#e5e5e5",
                        color: validRange ? "#fff" : "#aaa", border: "none",
                        fontSize: 14, fontWeight: 600, cursor: validRange ? "pointer" : "not-allowed",
                      }}
                    >
                      Continue
                    </button>
                  </div>
                )}

                {/* Step 3: Terms */}
                {step === 3 && (
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>
                      Terms & Conditions
                    </h2>
                    <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px", lineHeight: 1.5 }}>
                      Please read and accept our rules and policies before we assign your team.
                    </p>

                    <div style={{
                      padding: "14px 16px", borderRadius: 12,
                      background: "#fafafa", border: "1px solid #f0f0f0",
                      marginBottom: 20, fontSize: 13, color: "#666", lineHeight: 1.6,
                    }}>
                      <p style={{ margin: "0 0 10px", fontWeight: 600, color: "#1a1a1a" }}>
                        By continuing, you agree to:
                      </p>
                      <ul style={{ margin: "0 0 12px", paddingLeft: 16 }}>
                        <li style={{ marginBottom: 6 }}>Your team will be assigned within 24 hours</li>
                        <li style={{ marginBottom: 6 }}>Your dedicated specialist works within your selected time slot</li>
                        <li style={{ marginBottom: 6 }}>All data is handled per our privacy policy</li>
                        <li>You may cancel or reschedule anytime</li>
                      </ul>
                      <p style={{ margin: 0 }}>
                        Read the full <Link href="/rules" style={{ color: "#000", fontWeight: 600, textDecoration: "underline" }}>Rules & Policies</Link> page for complete details.
                      </p>
                    </div>

                    <label style={{
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      padding: "14px 16px", borderRadius: 12,
                      background: accepted ? "#f0fdf4" : "#fafafa",
                      border: `1px solid ${accepted ? "#bbf7d0" : "#f0f0f0"}`,
                      marginBottom: 24, transition: "all 0.15s ease",
                    }}>
                      <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "#000", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>
                        I have read and accept the terms, conditions, and rules
                      </span>
                    </label>

                    <button type="button" onClick={handleRequestSubmit} disabled={!accepted}
                      style={{
                        width: "100%", padding: "12px 20px", borderRadius: 12,
                        background: accepted ? "#000" : "#e5e5e5",
                        color: accepted ? "#fff" : "#aaa", border: "none",
                        fontSize: 14, fontWeight: 600, cursor: accepted ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}
                    >
                      Continue
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}

              </div>
            </div>
          ) : submitted && !showChat ? (
            /* Confirmation screen */
            <div style={{ maxWidth: 520, margin: "0 auto" }}>
              <div style={{ ...card, padding: 40, textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "#f0fdf4", display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 20px",
                }}>
                  <CheckCircle size={28} style={{ color: "#22c55e" }} />
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 999,
                  background: "#fffbeb", border: "1.5px solid #fef3c7",
                  color: "#d97706", fontSize: 11.5, fontWeight: 700,
                  marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.03em"
                }}>
                  <Clock size={13} />
                  <span>Request Pending Approval</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
                  Team Request Submitted
                </h2>
                <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px", lineHeight: 1.6 }}>
                  Your dedicated AI ranking specialist team will be assigned within <strong style={{ color: "#1a1a1a" }}>24 hours</strong>.
                  We will send a confirmation email with full details once the assignment is complete.
                </p>
                <div style={{
                  padding: "16px 20px", borderRadius: 12,
                  background: "#fafafa", border: "1px solid #f0f0f0",
                  marginBottom: 24, textAlign: "left",
                }}>
                  <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                    <p style={{ margin: 0 }}>Team name: <strong style={{ color: "#1a1a1a" }}>{skipped || !teamName.trim() ? "Name Your Team" : teamName}</strong></p>
                    <p style={{ margin: "4px 0 0" }}>Shift: <strong style={{ color: "#1a1a1a" }}>{fromTime} – {toTime}</strong> ({diff} hours)</p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Sparkles size={14} />
                  Thanks for your patience. We will email you when your team is ready.
                </p>
              </div>
            </div>
          ) : (
            /* Chat UI */
            <div style={{ height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>

              {/* Chat header bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 20px",
                flexShrink: 0, background: "#fff",
                borderRadius: "12px 12px 0 0",
                borderLeft: "1px solid #f0f0f0",
                borderRight: "1px solid #f0f0f0",
                borderTop: "1px solid #f0f0f0",
                borderBottom: "1px solid #f0f0f0",
              }}>
                <Image src="/favicon/logo.png" alt="Grow Citable" width={28} height={28} style={{ objectFit: "contain" }} />
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: "auto", padding: "16px 20px",
                display: "flex", flexDirection: "column", gap: 12,
                background: "#fff",
                borderLeft: "1px solid #f0f0f0",
                borderRight: "1px solid #f0f0f0",
              }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{
                    display: "flex", gap: 10, maxWidth: "75%",
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  }}>
                    <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: msg.role === "user" ? "#f0f0f0" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {msg.role === "user" ? (
                      <User size={14} style={{ color: "#666" }} />
                    ) : null}
                    </div>
                    <div style={{
                      padding: "10px 14px", borderRadius: 12,
                      background: msg.role === "user" ? "#000" : "#f8f9fa",
                      color: msg.role === "user" ? "#fff" : "#1a1a1a",
                      fontSize: 13, lineHeight: 1.5,
                      borderTopRightRadius: msg.role === "user" ? 4 : 12,
                      borderTopLeftRadius: msg.role === "user" ? 12 : 4,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: "flex", gap: 10, alignSelf: "flex-start" }}>
                    <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "transparent", display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                  </div>
                    <div style={{
                      padding: "10px 14px", borderRadius: 12, borderTopLeftRadius: 4,
                      background: "#f8f9fa",
                      display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#1a1a1a",
                    }}>
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      Typing...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: "12px 20px",
                borderLeft: "1px solid #f0f0f0",
                borderRight: "1px solid #f0f0f0",
                borderBottom: "1px solid #f0f0f0",
                flexShrink: 0, background: "#fff",
                borderRadius: "0 0 12px 12px",
              }}>
                {files.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    {files.map((f, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 10px", borderRadius: 8,
                        background: "#f8f9fa", border: "1px solid #e5e5e5",
                        fontSize: 11, color: "#555", fontWeight: 500,
                      }}>
                        <FileText size={12} style={{ color: "#999" }} />
                        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                        <button type="button" onClick={() => handleRemoveFile(i)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
                        >
                          <X size={12} style={{ color: "#999" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  borderRadius: 12, border: "1.5px solid #e5e5e5",
                  padding: "0 4px 0 16px", background: "#fafafa",
                }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}
                  >
                    <Paperclip size={16} style={{ color: "#bbb" }} />
                  </button>
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <input
                    type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your SEO..."
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      padding: "12px 0", fontSize: 14, color: "#1a1a1a",
                    }}
                    disabled={isTyping}
                  />
                  <button type="button" onClick={handleSend}
                    disabled={(!input.trim() && files.length === 0) || isTyping}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: (input.trim() || files.length > 0) && !isTyping ? "#000" : "#e5e5e5",
                      border: "none",
                      cursor: (input.trim() || files.length > 0) && !isTyping ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Send size={16} style={{
                      color: (input.trim() || files.length > 0) && !isTyping ? "#fff" : "#ccc",
                    }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        </div>
      </main>
    </div>
  );
}
