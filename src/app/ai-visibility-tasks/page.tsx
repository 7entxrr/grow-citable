"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "../page.module.css";
import { CheckCircle, XCircle, Sparkles, ArrowRight, Target, Search, Globe, Users, MessageSquare, Eye, FileText, Zap, Shield, BarChart3, AlertCircle, Loader2, Send, X, Lock } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { getUserAudits, saveAuditToFirestore } from "@/lib/auditFirestore";
import Link from "next/link";

const ENGINE_LOGOS: Record<string, string> = {
  "ChatGPT": "/ai-logo/chatgpt.png",
  "Google Gemini": "/ai-logo/gemini.png",
  "Claude": "/ai-logo/claude.png",
  "Perplexity": "/ai-logo/perplexity.png",
  "DeepSeek": "/ai-logo/deepseek.png",
  "Bing Copilot": "/ai-logo/copilot.webp",
};

type StepStatus = "pending" | "done" | "ignored";

interface TaskItem {
  id: string;
  title: string;
  desc: string;
  engine: string;
  difficulty: string;
  diagnostic: string;
  status: StepStatus;
  fixedAt: string | null;
  auditPassed: boolean | null;
  auditReason?: string;
  chatHistory?: ChatMessage[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const cardStyle = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #f0f0f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

// Simplified markdown renderer for code blocks and bold text
function renderMessageContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).trim().split("\n");
      // Check if first line is language label
      const hasLang = /^[a-zA-Z0-9+#-]+$/.test(lines[0] || "");
      const codeLines = hasLang ? lines.slice(1) : lines;
      return (
        <pre key={index} style={{
          background: "#1E1E2E",
          color: "#CDD6F4",
          padding: "16px",
          borderRadius: "8px",
          fontFamily: "Courier, monospace",
          fontSize: "12.5px",
          lineHeight: 1.5,
          overflowX: "auto",
          margin: "12px 0",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)"
        }}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    }
    
    // Highlight lines starting with # as headers or ** as bold
    const lines = part.split("\n");
    return (
      <div key={index}>
        {lines.map((line, lIdx) => {
          if (line.startsWith("### ")) {
            return <h4 key={lIdx} style={{ margin: "14px 0 8px 0", color: "#1A1A1D", fontWeight: 700, fontSize: "14.5px" }}>{line.slice(4)}</h4>;
          }
          if (line.startsWith("## ")) {
            return <h3 key={lIdx} style={{ margin: "16px 0 10px 0", color: "#1A1A1D", fontWeight: 700, fontSize: "16px" }}>{line.slice(3)}</h3>;
          }
          if (line.startsWith("# ")) {
            return <h2 key={lIdx} style={{ margin: "18px 0 12px 0", color: "#1A1A1D", fontWeight: 700, fontSize: "18px" }}>{line.slice(2)}</h2>;
          }
          
          // Replace **bold**
          const boldParts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={lIdx} style={{ margin: "4px 0", lineHeight: 1.5 }}>
              {boldParts.map((bp, bIdx) => {
                if (bp.startsWith("**") && bp.endsWith("**")) {
                  return <strong key={bIdx} style={{ fontWeight: 700, color: "#111" }}>{bp.slice(2, -2)}</strong>;
                }
                return bp;
              })}
            </p>
          );
        })}
      </div>
    );
  });
}

export default function AIVisibilityTasksPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [joiningDate, setJoiningDate] = useState<Date>(() => new Date());
  const [userPlan, setUserPlan] = useState<string>("Free");

  // Navigation & Selections
  const [websites, setWebsites] = useState<string[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const current = new Date();
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
  });

  // State values for current day's tasks
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [auditRun, setAuditRun] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const currentTask = tasks[currentStep] || null;
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [auditing, setAuditing] = useState(false);

  // AI Co-pilot Chat Drawer state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Global historical records map for dates indicators warning dots
  const [daysRecords, setDaysRecords] = useState<Record<string, any>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto Scroll Chat Drawer to bottom
  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      const t = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [chatMessages, chatLoading, chatOpen]);

  // Sync chat drawer messages when the current task step changes while drawer is open
  useEffect(() => {
    if (chatOpen && currentTask) {
      setChatMessages(currentTask.chatHistory || []);
    }
  }, [currentStep, chatOpen, currentTask]);

  // Fetch basic user context and audited sites
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const userDocRef = doc(db, "users", u.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserPlan(data.plan || "Free");
            if (data.createdAt) {
              const createdDate = typeof data.createdAt.toDate === "function"
                ? data.createdAt.toDate()
                : new Date(data.createdAt);
              setJoiningDate(createdDate);
            }
          } else if (u.metadata.creationTime) {
            setJoiningDate(new Date(u.metadata.creationTime));
          }
        } catch (err) {
          console.error("Error fetching user createdAt:", err);
          if (u.metadata.creationTime) {
            setJoiningDate(new Date(u.metadata.creationTime));
          }
        }

        // Fetch user audited websites
        try {
          const audits = await getUserAudits(u.uid);
          const domains = Array.from(new Set(audits.map(a => {
            try {
              return new URL(a.url).hostname.replace(/^www\./, "");
            } catch {
              return a.url.replace(/^www\./, "");
            }
          }))).filter(Boolean);

          setWebsites(domains);
          if (domains.length > 0) {
            setSelectedWebsite(domains[0]);
          }
        } catch (error) {
          console.error("Error loading audited websites:", error);
        }
      }
    });
  }, []);

  const activeSelectedWebsite = selectedWebsite || (websites.length > 0 ? websites[0] : "mywebsite.com");

  // Fetch all historical records to paint status warnings
  const fetchDaysRecords = async () => {
    if (!user) return;
    try {
      const q = collection(db, "users", user.uid, "task_days");
      const snap = await getDocs(q);
      const records: Record<string, any> = {};
      snap.forEach(doc => {
        records[doc.id] = doc.data();
      });
      setDaysRecords(records);
    } catch (e) {
      console.error("Error fetching historical task records:", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDaysRecords();
    }
  }, [user, activeSelectedWebsite]);

  // Load or automatically generate today's tasks
  useEffect(() => {
    const loadOrCreateTasks = async () => {
      if (!user || !activeSelectedWebsite || !selectedDate) return;
      
      setLoadingTasks(true);
      const recordKey = `${activeSelectedWebsite}_${selectedDate}`;
      const docRef = doc(db, "users", user.uid, "task_days", recordKey);
      
      try {
        const planName = userPlan.toLowerCase();
        const maxTasks = planName === 'starter' ? 5 : planName === 'growth' ? 10 : 20;

        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const rawTasks: TaskItem[] = data.tasks || [];
          setTasks(rawTasks.slice(0, maxTasks));
          setAuditRun(!!data.auditRun);
          setCurrentStep(0);
        } else {
          const genRes = await fetch("/api/ai-visibility/generate-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: activeSelectedWebsite, date: selectedDate })
          });
          
          let generated: any[] = [];
          if (genRes.ok) {
            const data = await genRes.json();
            generated = data.tasks || [];
          }
          
          const slicedGenerated = generated.slice(0, maxTasks);
          
          const initialTasks: TaskItem[] = slicedGenerated.map((t: any) => ({
            id: t.id,
            title: t.title,
            desc: t.desc,
            engine: t.engine,
            difficulty: t.difficulty,
            diagnostic: t.diagnostic,
            status: "pending",
            fixedAt: null,
            auditPassed: null
          }));

          await setDoc(docRef, {
            tasks: initialTasks,
            auditRun: false,
            updated_at: new Date()
          });

          setTasks(initialTasks);
          setAuditRun(false);
          setCurrentStep(0);
          fetchDaysRecords(); // Refresh warnings
        }
      } catch (err) {
        console.error("Error loading or generating daily tasks:", err);
      } finally {
        setLoadingTasks(false);
      }
    };

    loadOrCreateTasks();
  }, [user, activeSelectedWebsite, selectedDate, userPlan]);

  // Generate list of dates from joiningDate to current date
  const datesList = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    const start = new Date(joiningDate);
    start.setHours(0, 0, 0, 0);

    if (start > current) {
      start.setTime(current.getTime());
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const iter = new Date(start);

    while (iter <= current) {
      const year = iter.getFullYear();
      const monthIdx = iter.getMonth();
      const dateVal = iter.getDate();

      const key = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(dateVal).padStart(2, "0")}`;
      const label = `${dateVal} ${monthNames[monthIdx]} ${year}`;

      list.push({ key, label });

      iter.setDate(iter.getDate() + 1);
    }
    return list.reverse();
  }, [joiningDate]);

  // Task Status updates
  const setStepStatus = async (id: string, status: StepStatus) => {
    if (!user) return;
    const recordKey = `${activeSelectedWebsite}_${selectedDate}`;
    const docRef = doc(db, "users", user.uid, "task_days", recordKey);
    
    const updatedTasks = tasks.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status,
          fixedAt: status === "done" ? new Date().toISOString() : null,
          auditPassed: null
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    try {
      await updateDoc(docRef, {
        tasks: updatedTasks,
        updated_at: new Date()
      });
      fetchDaysRecords();
    } catch (e) {
      console.error("Error updating step status in Firestore:", e);
    }
  };

  // Submit and audit logic
  const handleAuditSubmit = async () => {
    if (!user || tasks.length === 0) return;

    setAuditing(true);
    try {
      // 1. Task Validation Audit
      const verifyRes = await fetch("/api/ai-visibility/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: activeSelectedWebsite, tasks })
      });

      let verifyList: any[] = [];
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        verifyList = data.results || [];
      }

      const updatedTasks = tasks.map(t => {
        const matching = verifyList.find(r => r.id === t.id);
        if (matching) {
          return {
            ...t,
            auditPassed: matching.success,
            auditReason: matching.reason
          };
        }
        return t;
      });

      // 2. Full Website Audit Update (triggers dashboard scores sync)
      try {
        const newAuditRes = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: `https://${activeSelectedWebsite}` })
        });
        if (newAuditRes.ok) {
          const auditData = await newAuditRes.json();
          await saveAuditToFirestore(user.uid, auditData);
        }
      } catch (auditErr) {
        console.error("Dashboard re-audit background sync failed:", auditErr);
      }

      // 3. Write final task results to Firestore
      const recordKey = `${activeSelectedWebsite}_${selectedDate}`;
      const docRef = doc(db, "users", user.uid, "task_days", recordKey);
      await updateDoc(docRef, {
        tasks: updatedTasks,
        auditRun: true,
        updated_at: new Date()
      });

      setTasks(updatedTasks);
      setAuditRun(true);
      await fetchDaysRecords();
      alert("Website audit complete! Completed tasks have been audited against your website's live code.");
    } catch (err) {
      console.error("Error submitting task audit:", err);
      alert("Failed to execute audit verification. Please try again.");
    } finally {
      setAuditing(false);
    }
  };

  // Explain with AI trigger
  const handleExplainClick = async () => {
    const currentTask = tasks[currentStep];
    if (!currentTask) return;

    if (currentTask.chatHistory && currentTask.chatHistory.length > 0) {
      setChatMessages(currentTask.chatHistory);
      setChatOpen(true);
      return;
    }

    setChatOpen(true);
    const initialQuery = `Explain how to implement "${currentTask.title}" for my website "${activeSelectedWebsite}". Please give me instructions and code templates if applicable.`;
    
    // Setup initial messages
    const initialMessages: ChatMessage[] = [
      { role: 'user', content: initialQuery }
    ];
    setChatMessages(initialMessages);
    setChatLoading(true);

    try {
      const tokenRes = await fetch('/api/consume-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, amount: 1 })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        setChatMessages([...initialMessages, { role: 'assistant', content: tokenData.message || "Insufficient tokens. Please upgrade your plan." }]);
        setChatLoading(false);
        return;
      }

      const res = await fetch('/api/ai-visibility/explain-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTask.title,
          desc: currentTask.desc,
          diagnostic: currentTask.diagnostic,
          engine: currentTask.engine,
          domain: activeSelectedWebsite,
          messages: initialMessages
        })
      });

      if (res.ok) {
        const data = await res.json();
        const finalMessages: ChatMessage[] = [...initialMessages, { role: 'assistant', content: data.reply }];
        setChatMessages(finalMessages);

        // Update task chat history in state
        const updatedTasks = tasks.map(t => {
          if (t.id === currentTask.id) {
            return { ...t, chatHistory: finalMessages };
          }
          return t;
        });
        setTasks(updatedTasks);

        // Write update to Firestore
        const recordKey = `${activeSelectedWebsite}_${selectedDate}`;
        const docRef = doc(db, "users", user.uid, "task_days", recordKey);
        await updateDoc(docRef, {
          tasks: updatedTasks,
          updated_at: new Date()
        }).catch(err => console.error("Error saving chat in Firestore:", err));
      } else {
        setChatMessages([...initialMessages, { role: 'assistant', content: "Sorry, I couldn't reach the backend server to audit the instructions. Please try again." }]);
      }
    } catch (err) {
      console.error("Error invoking explain task:", err);
      setChatMessages([...initialMessages, { role: 'assistant', content: "An error occurred while generating guide details. Please double-check connection settings." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Send message back and forth in Chat Drawer
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const currentTask = tasks[currentStep];
    if (!currentTask) return;

    const userMsg = chatInput.trim();
    setChatInput("");

    const updatedHistory: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: userMsg }
    ];

    setChatMessages(updatedHistory);
    setChatLoading(true);

    try {
      const tokenRes = await fetch('/api/consume-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, amount: 1 })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        setChatMessages([...updatedHistory, { role: 'assistant', content: tokenData.message || "Insufficient tokens. Please upgrade your plan." }]);
        setChatLoading(false);
        return;
      }

      const res = await fetch('/api/ai-visibility/explain-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTask.title,
          desc: currentTask.desc,
          diagnostic: currentTask.diagnostic,
          engine: currentTask.engine,
          domain: activeSelectedWebsite,
          messages: updatedHistory
        })
      });

      if (res.ok) {
        const data = await res.json();
        const finalMessages: ChatMessage[] = [...updatedHistory, { role: 'assistant', content: data.reply }];
        setChatMessages(finalMessages);

        // Update task chat history in state
        const updatedTasks = tasks.map(t => {
          if (t.id === currentTask.id) {
            return { ...t, chatHistory: finalMessages };
          }
          return t;
        });
        setTasks(updatedTasks);

        // Write update to Firestore
        const recordKey = `${activeSelectedWebsite}_${selectedDate}`;
        const docRef = doc(db, "users", user.uid, "task_days", recordKey);
        await updateDoc(docRef, {
          tasks: updatedTasks,
          updated_at: new Date()
        }).catch(err => console.error("Error saving chat in Firestore:", err));
      } else {
        setChatMessages([...updatedHistory, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
      }
    } catch (err) {
      console.error("Chat message send failure:", err);
      setChatMessages([...updatedHistory, { role: 'assistant', content: "Could not send request. Please check internet status." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const doneCount = tasks.filter(t => t.status === "done").length;
  const ignoredCount = tasks.filter(t => t.status === "ignored").length;
  const totalDone = doneCount + ignoredCount;

  const StepIcon = currentTask ? (ENGINE_LOGOS[currentTask.engine] ? Globe : MessageSquare) : Target;

  if (!mounted) {
    return (
      <div className={styles.dashboardContainer}>
        <Sidebar />
        <main className={styles.mainContent}>
          <div className={styles.contentWrapper}></div>
        </main>
      </div>
    );
  }

  const getTodayKey = (): string => {
    const current = new Date();
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
  };

  // Check if a specific date has failed verify steps (red) or is in the past and unaudited (yellow)
  const getDateWarningStatus = (dateKey: string): "red" | "yellow" | "none" => {
    const record = daysRecords[`${activeSelectedWebsite}_${dateKey}`];
    const today = getTodayKey();

    if (record && record.auditRun) {
      const hasFailed = (record.tasks || []).some((t: any) => t.status === "done" && t.auditPassed === false);
      if (hasFailed) return "red";
    }

    if (dateKey !== today) {
      if (!record || !record.auditRun) {
        return "yellow";
      }
    }

    return "none";
  };

  // Check if the current website selection has any failing audits (red) or past unaudited days (yellow)
  const getWebsiteWarningStatus = (webDomain: string): "red" | "yellow" | "none" => {
    let hasYellow = false;
    const today = getTodayKey();

    for (const d of datesList) {
      const record = daysRecords[`${webDomain}_${d.key}`];
      if (record && record.auditRun) {
        const hasFailed = (record.tasks || []).some((t: any) => t.status === "done" && t.auditPassed === false);
        if (hasFailed) return "red";
      } else if (d.key !== today) {
        hasYellow = true;
      }
    }

    return hasYellow ? "yellow" : "none";
  };

  if (userPlan.toLowerCase() === 'free') {
    return (
      <div className={styles.dashboardContainer} style={{ background: "#F5F5F7", minHeight: "100vh" }}>
        <Sidebar />
        <main className={styles.mainContent}>
          <div className={styles.contentWrapper} style={{ padding: "40px 48px", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
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
                Unlock AI Visibility Tasks
              </h2>
              <p style={{ fontSize: 15, color: "#5C544E", margin: "0 0 24px 0", lineHeight: 1.5 }}>
                AI Visibility Tasks are part of our premium AEO and GEO recommendations engine. 
                Upgrade to a Starter, Growth, or Ultra subscription to unlock daily customized task checklists and get your AI co-pilot.
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
    <div className={styles.dashboardContainer} style={{ background: "#F5F5F7", minHeight: "100vh" }}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper} style={{ padding: "40px 48px", maxWidth: 1200, margin: "0 auto" }}>

          {/* Website Selection Tabs */}
          {websites.length > 0 && (
            <div style={{ 
              display: "flex", 
              gap: 8, 
              overflowX: "auto", 
              paddingBottom: 8, 
              marginBottom: 12,
              borderBottom: "1px solid #f0f0f0",
              scrollbarWidth: "thin"
            }}>
              {websites.map((web) => {
                const isActive = activeSelectedWebsite === web;
                const status = getWebsiteWarningStatus(web);
                return (
                  <button
                    key={web}
                    type="button"
                    onClick={() => setSelectedWebsite(web)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "10px",
                      border: "1.5px solid",
                      borderColor: isActive ? "#000" : "#e5e5e5",
                      background: isActive ? "#000" : "#fff",
                      color: isActive ? "#fff" : "#444",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                      position: "relative",
                      boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                    }}
                  >
                    {web}
                    {status !== "none" && (
                      <span 
                        title={status === "red" ? "Some tasks failed validation" : "Contains past unfinished task days"}
                        style={{
                          position: "absolute", top: 4, right: 4,
                          width: 8, height: 8, borderRadius: "50%",
                          background: status === "red" ? "#ef4444" : "#eab308"
                        }} 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Horizontal Scrollable Dates */}
          <div style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 8,
            marginBottom: 16,
            borderBottom: "1px solid #f0f0f0",
            scrollbarWidth: "thin"
          }}>
            {datesList.map((d) => {
              const isActive = selectedDate === d.key;
              const status = getDateWarningStatus(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDate(d.key)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: isActive ? "1.5px solid #22c55e" : "1.5px solid #e5e5e5",
                    background: isActive ? "rgba(34, 197, 94, 0.08)" : "#fff",
                    color: isActive ? "#16a34a" : "#666",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    position: "relative",
                    transition: "all 0.15s ease",
                  }}
                >
                  {d.label}
                  {status !== "none" && (
                    <span 
                      title={status === "red" ? "Some tasks failed validation" : "Past unfinished task day"}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        width: 8, height: 8, borderRadius: "50%",
                        background: status === "red" ? "#ef4444" : "#eab308"
                      }} 
                    />
                  )}
                </button>
              );
            })}
          </div>

          {loadingTasks ? (
            /* Loading Spinner for Generation */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
              <Loader2 className="animate-spin" size={40} style={{ color: '#7C5CFF', marginBottom: '16px', animation: 'slowSpin 1.5s linear infinite' }} />
              <p style={{ fontSize: '15px', color: '#6B7280', fontWeight: 600 }}>
                AI is compiling {userPlan.toLowerCase() === 'starter' ? '5' : userPlan.toLowerCase() === 'growth' ? '10' : '20'} custom visibility tasks for {activeSelectedWebsite}...
              </p>
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ ...cardStyle, padding: 48, textAlign: 'center' }}>
              <p style={{ color: '#6B7280', fontSize: 15 }}>No tasks could be generated for today. Please verify your website setup.</p>
            </div>
          ) : (
            <>
              {/* Step navigation pills */}
              <div style={{ display: "flex", gap: 6, overflow: "auto", paddingBottom: 6, marginBottom: 24, scrollbarWidth: "thin" }}>
                {tasks.map((s, i) => {
                  const isActive = i === currentStep;
                  const isDone = s.status === "done";
                  const isIgnored = s.status === "ignored";
                  const auditFailed = s.status === "done" && s.auditPassed === false;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCurrentStep(i)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 999,
                        border: isActive ? "1.5px solid #000" : isDone ? (auditFailed ? "1.5px solid #fecaca" : "1.5px solid #bbf7d0") : isIgnored ? "1.5px solid #fef3c7" : "1.5px solid #e5e5e5",
                        background: isActive ? "#000" : isDone ? (auditFailed ? "#fef2f2" : "#f0fdf4") : isIgnored ? "#fffbeb" : "transparent",
                        color: isActive ? "#fff" : isDone ? (auditFailed ? "#dc2626" : "#16a34a") : isIgnored ? "#b45309" : "#666",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        whiteSpace: "nowrap", flexShrink: 0,
                        position: "relative",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isDone && !auditFailed && <CheckCircle size={12} />}
                      {isIgnored && <XCircle size={12} />}
                      {auditFailed && <AlertCircle size={12} color="#dc2626" />}
                      Step {i + 1}
                      {auditFailed && (
                        <span 
                          title="Verification failed: could not confirm fix implementation on your site"
                          style={{
                            position: "absolute", top: -2, right: -2,
                            width: 8, height: 8, borderRadius: "50%", background: "#ef4444"
                          }} 
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>

                {/* Left: Current Step details */}
                <div style={{ ...cardStyle, padding: 32, background: "#FFFFFF" }}>

                  {/* Step details header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: ENGINE_LOGOS[currentTask.engine] ? "transparent" : "#7C5CFF12",
                        display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {ENGINE_LOGOS[currentTask.engine] ? (
                          <img
                            src={ENGINE_LOGOS[currentTask.engine]}
                            alt={currentTask.engine}
                            width={30}
                            height={30}
                            style={{ borderRadius: "6px", objectFit: "contain" }}
                          />
                        ) : (
                          <StepIcon size={18} style={{ color: "#7C5CFF" }} />
                        )}
                      </div>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Step {currentStep + 1} of {tasks.length}
                        </span>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "2px 0 0" }}>
                          {currentTask.title}
                        </h2>
                      </div>
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: currentTask.difficulty === "Easy" ? "#f0fdf4" : currentTask.difficulty === "Medium" ? "#fefce8" : "#fef2f2",
                      color: currentTask.difficulty === "Easy" ? "#16a34a" : currentTask.difficulty === "Medium" ? "#ca8a04" : "#dc2626",
                    }}>
                      {currentTask.difficulty}
                    </span>
                  </div>

                  {/* Engine designation */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 12px", borderRadius: 999,
                    background: "#f8f9fa", border: "1px solid #e5e5e5",
                    fontSize: 12, fontWeight: 600, color: "#666",
                    marginBottom: 16,
                  }}>
                    {ENGINE_LOGOS[currentTask.engine] ? (
                      <img
                        src={ENGINE_LOGOS[currentTask.engine]}
                        alt={currentTask.engine}
                        width={14}
                        height={14}
                        style={{ borderRadius: "3px", objectFit: "contain" }}
                      />
                    ) : (
                      <Globe size={12} />
                    )}
                    <span>{currentTask.engine}</span>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 16px" }}>
                    {currentTask.desc}
                  </p>

                  {/* Explain link with Co-pilot trigger */}
                  <div style={{ marginBottom: 20, textAlign: "left" }}>
                    <span 
                      onClick={handleExplainClick}
                      style={{ 
                        fontSize: "13px", 
                        fontWeight: 600, 
                        color: "#7C5CFF", 
                        cursor: "pointer", 
                        textDecoration: "underline",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Sparkles size={13} />
                      Explain with Citable AI
                    </span>
                  </div>

                  {/* Diagnostic */}
                  <div style={{
                    padding: "14px 16px", borderRadius: 12,
                    background: "#fafafa", border: "1px solid #f0f0f0",
                    fontSize: 13, color: "#666", lineHeight: 1.5, marginBottom: 24,
                  }}>
                    <strong style={{ color: "#1a1a1a" }}>Diagnostic:</strong> {currentTask.diagnostic}
                  </div>

                  {/* Verification Failure Message */}
                  {currentTask.status === "done" && currentTask.auditPassed === false && (
                    <div style={{
                      display: "flex", gap: 8, padding: "14px 16px", borderRadius: 12,
                      background: "#fef2f2", border: "1.5px solid #fecaca",
                      fontSize: 13, color: "#dc2626", lineHeight: 1.5, marginBottom: 24,
                    }}>
                      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <strong style={{ fontWeight: 600 }}>Audit Verification Failed:</strong> {currentTask.auditReason || "The system crawled your site but could not detect this fix. Please double check that it has been deployed correctly."}
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setStepStatus(currentTask.id, "done")}
                      style={{
                        flex: 1, padding: "12px 20px", borderRadius: 12,
                        background: currentTask.status === "done" ? "#22c55e" : "#f0fdf4",
                        color: currentTask.status === "done" ? "#fff" : "#16a34a",
                        border: currentTask.status === "done" ? "1.5px solid #22c55e" : "1.5px solid #bbf7d0",
                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <CheckCircle size={16} style={{ color: currentTask.status === "done" ? "#fff" : "#16a34a" }} />
                      Mark Done
                    </button>
                    <button
                      type="button"
                      onClick={() => setStepStatus(currentTask.id, "ignored")}
                      style={{
                        flex: 1, padding: "12px 20px", borderRadius: 12,
                        background: currentTask.status === "ignored" ? "#fef3c7" : "#fffbeb",
                        color: currentTask.status === "ignored" ? "#d97706" : "#b45309",
                        border: currentTask.status === "ignored" ? "1.5px solid #fde68a" : "1.5px solid #fef3c7",
                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <XCircle size={16} style={{ color: currentTask.status === "ignored" ? "#d97706" : "#b45309" }} />
                      Ignore
                    </button>
                  </div>

                  {/* Wizard navigation footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                      style={{
                        padding: "10px 20px", borderRadius: 10,
                        background: currentStep > 0 ? "#f8f9fa" : "#f5f5f5",
                        border: "1px solid #e5e5e5",
                        color: currentStep > 0 ? "#1a1a1a" : "#ccc",
                        fontSize: 13, fontWeight: 600, cursor: currentStep > 0 ? "pointer" : "not-allowed",
                        transition: "all 0.15s ease",
                      }}
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(Math.min(19, currentStep + 1))}
                      disabled={currentStep === 19}
                      style={{
                        padding: "10px 20px", borderRadius: 10,
                        background: currentStep < 19 ? "#000" : "#f5f5f5",
                        border: "1.5px solid #000",
                        color: currentStep < 19 ? "#fff" : "#ccc",
                        fontSize: 13, fontWeight: 600, cursor: currentStep < 19 ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", gap: 6,
                        transition: "all 0.15s ease",
                      }}
                    >
                      Next Step
                      <ArrowRight size={14} />
                    </button>
                  </div>

                </div>

                {/* Right: Summary & Audit Submission */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Summary Card */}
                  <div style={{ ...cardStyle, padding: 20, background: "#FFFFFF" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 16px" }}>
                      Progress Summary
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <CheckCircle size={14} /> Completed
                        </span>
                        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{doneCount}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <XCircle size={14} /> Ignored
                        </span>
                        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{ignoredCount}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ color: "#999", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #ccc", display: "inline-block" }} /> Pending
                        </span>
                        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{tasks.length - totalDone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Score Card */}
                  <div style={{ ...cardStyle, padding: 20, background: "#FFFFFF" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 12px" }}>
                      AI Visibility Score
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a" }}>
                        {Math.round((doneCount / tasks.length) * 100)}
                      </span>
                      <span style={{ fontSize: 14, color: "#999" }}>/ 100</span>
                    </div>
                    <div style={{ height: 4, background: "#f0f0f0", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${(doneCount / tasks.length) * 100}%`, height: "100%", background: "#7C5CFF", borderRadius: 999, transition: "width 0.3s ease" }} />
                    </div>
                    <p style={{ fontSize: 11.5, color: "#888", marginTop: 10, margin: "10px 0 0", lineHeight: 1.4 }}>
                      Complete and audit your tasks to improve brand prominence indices across generative search targets.
                    </p>
                  </div>

                  {/* Submit for Audit card */}
                  <div style={{ ...cardStyle, padding: 20, background: "#FFFFFF", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Audit Verification</h4>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                        Submit all addressed tasks to trigger an AI crawler check and automatically refresh your central dashboard ratings.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={totalDone < tasks.length || auditing}
                      onClick={handleAuditSubmit}
                      style={{
                        width: "100%", padding: "12px", borderRadius: 10,
                        background: totalDone === tasks.length && !auditing ? "#7C5CFF" : "#E5E7EB",
                        color: totalDone === tasks.length && !auditing ? "#fff" : "#9ca3af",
                        fontSize: 13, fontWeight: 700, border: "none",
                        cursor: totalDone === tasks.length && !auditing ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {auditing ? (
                        <>
                          <Loader2 size={16} style={{ animation: "slowSpin 1.5s linear infinite" }} />
                          <span>Auditing Website Code...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Submit & Re-Audit Site</span>
                        </>
                      )}
                    </button>
                    {totalDone < tasks.length && (
                      <span style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
                        Remaining tasks: {tasks.length - totalDone} before submission.
                      </span>
                    )}
                  </div>

                </div>

              </div>
            </>
          )}

          {/* Slide-over AI Co-pilot Chat Drawer */}
          {chatOpen && (
            <>
              {/* Back backdrop overlay */}
              <div 
                onClick={() => setChatOpen(false)}
                style={{
                  position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.15)",
                  backdropFilter: "blur(4px)"
                }} 
              />
              
              {/* Floating Panel sliding from right */}
              <div style={{
                position: "fixed",
                top: 0,
                right: 0,
                height: "100vh",
                width: "480px",
                maxWidth: "100vw",
                background: "#FFFFFF",
                boxShadow: "-8px 0 32px rgba(9, 10, 15, 0.12)",
                zIndex: 10000,
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}>
                {/* Drawer Header */}
                <div style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #ECECEF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#FAFBFB"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={18} style={{ color: "#7C5CFF" }} />
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#090A0F", margin: 0 }}>Citable AI</h3>
                      <span style={{ fontSize: "11px", color: "#6B7280" }}>{currentTask?.title}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setChatOpen(false)}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer", 
                      color: "#6B7280", padding: 4, borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center", transition: "background 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.background = "#ECECEF"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Messages Panel Container */}
                <div style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                  background: "#F8F9FA",
                }}>
                  {chatMessages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={idx} style={{
                        display: "flex",
                        justifyContent: isUser ? "flex-end" : "flex-start",
                        width: "100%",
                      }}>
                        <div style={{
                          maxWidth: "85%",
                          padding: "14px 18px",
                          borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                          background: isUser ? "#090A0F" : "#FFFFFF",
                          color: isUser ? "#FFFFFF" : "#333333",
                          border: isUser ? "none" : "1px solid #E4E4E7",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                          fontSize: "13.5px",
                          boxSizing: "border-box"
                        }}>
                          {isUser ? <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.content}</p> : renderMessageContent(msg.content)}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Assistant response loading state indicator bubble */}
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
                      <div style={{
                        padding: "14px 18px",
                        borderRadius: "16px 16px 16px 2px",
                        background: "#FFFFFF",
                        border: "1px solid #E4E4E7",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: "13px",
                        color: "#6B7280"
                      }}>
                        <Loader2 size={14} style={{ animation: "slowSpin 1.5s linear infinite" }} />
                        <span>Citable AI is reading code rules...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input area Form Footer */}
                <form onSubmit={handleSendChatMessage} style={{
                  padding: "18px 24px",
                  borderTop: "1px solid #ECECEF",
                  background: "#FFFFFF",
                  display: "flex",
                  gap: 10,
                  alignItems: "center"
                }}>
                  <input
                    type="text"
                    required
                    disabled={chatLoading}
                    placeholder="Ask co-pilot follow up questions..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      fontSize: "13.5px",
                      border: "1px solid #E4E4E7",
                      borderRadius: "10px",
                      outline: "none",
                      color: "#090A0F",
                      background: "#F9FAFB",
                      boxSizing: "border-box"
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "#7C5CFF"}
                    onBlur={e => e.currentTarget.style.borderColor = "#E4E4E7"}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    style={{
                      background: chatInput.trim() && !chatLoading ? "#7C5CFF" : "#E4E4E7",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "10px",
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed",
                      transition: "background 0.2s"
                    }}
                  >
                    <Send size={16} />
                  </button>
                </form>

              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
