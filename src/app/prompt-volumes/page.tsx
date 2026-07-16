"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ArrowRight, Search, BarChart3, Layers, Globe, Shield, Database, RefreshCw, ChevronDown } from "lucide-react";

const ACCENT = "#3B82F6";
const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

const faqItems = [
  {
    q: "What is Prompt Volumes?",
    a: "Prompt Volumes reveals the keywords and topics people are asking AI engines like ChatGPT, Gemini, Claude, and Perplexity. It helps you understand demand in the AI search landscape and prioritize which topics to target."
  },
  {
    q: "What data powers Prompt Volumes?",
    a: "Every insight is anchored in real data from double opt-in consumer panels, not API outputs or synthetic estimates. We aggregate billions of data signals daily to create the most comprehensive map of human-AI interactions available."
  },
  {
    q: "Is user privacy protected?",
    a: "All prompt data is anonymized, aggregated, and scrubbed of PII. Fully compliant with GDPR and CCPA. Panels are double opt-in."
  },
  {
    q: "How fresh is the data?",
    a: "Weekly data refresh with less than one week latency. Multi-region coverage spanning the US, UK, Canada, Germany, France, and more."
  },
  {
    q: "Can I segment by intent or sentiment?",
    a: "Yes. Prompt Volumes includes Automated Intent Classification with sub-intent breakdowns, so you can filter by informational, commercial, conversational, or generative intent."
  },
  {
    q: "Which Answer Engines are supported?",
    a: "ChatGPT, Gemini, Claude, and Perplexity are fully supported. Additional engines are coming soon."
  }
];

const features = [
  {
    title: "Interactive Keyword Hierarchy",
    desc: "Visualize how a seed keyword expands into related sub-topics and long-tail variations across AI conversations.",
    metric: "4.2M",
    metricLabel: "keywords mapped",
    icon: Layers
  },
  {
    title: "Multi-Tab Keyword Analysis",
    desc: "Switch between volume, intent, demographics, and hierarchy views to analyze any keyword from every angle.",
    metric: "8",
    metricLabel: "analysis views",
    icon: BarChart3
  },
  {
    title: "Keyword Lists & Grouping",
    desc: "Group related keywords into lists to track how specific initiatives or strategies perform across answer engines over time.",
    metric: "Unlimited",
    metricLabel: "custom lists",
    icon: Database
  },
  {
    title: "Demographic Breakdown",
    desc: "Filter prompt volume data by platform, age range, or income bracket to see how AI search demand varies across audience segments.",
    metric: "12",
    metricLabel: "demographic slices",
    icon: Globe
  }
];

const intentFeatures = [
  {
    title: "Automated Intent Classification",
    desc: "Find out if the queries you're tracking have informational, commercial, conversational, or generative intent.",
    color: "#3B82F6"
  },
  {
    title: "Sub-Intent Breakdown",
    desc: "Drill into sub-intents with a sunburst chart to see the full spectrum of user motivations behind any keyword.",
    color: "#8B5CF6"
  },
  {
    title: "Content-to-Intent Alignment",
    desc: "Align your content to each stage of the buyer journey, so AI engines have the right information at each prompt stage.",
    color: "#06B6D4"
  },
  {
    title: "Prioritize by Intent Volume",
    desc: "Identify which intents have the highest volume and prioritize content creation where it will drive the most AI visibility.",
    color: "#10B981"
  }
];

const competitiveFeatures = [
  {
    title: "Brand Relevant Prompts",
    desc: "Explore the specific prompts driving AI engines to cite any domain — yours or a competitor's — organized by URL and citation volume.",
    stat: "87%",
    statLabel: "citation coverage"
  },
  {
    title: "Co-Citation Mapping",
    desc: "See which competitors appear alongside your brand in the same AI-generated responses, broken down by topic and platform.",
    stat: "15+",
    statLabel: "competitors tracked"
  },
  {
    title: "Uncited Prompt Detection",
    desc: "Pinpoint the prompts where a competitor's content is cited and yours isn't, segmented by page and topic.",
    stat: "3x",
    statLabel: "opportunity discovery"
  }
];

const trustItems = [
  { icon: Database, title: "Scale", desc: "We process billions of data signals daily to create the most comprehensive map of human-AI interactions available." },
  { icon: Search, title: "Real-World Foundation", desc: "Every insight is anchored in real data from double opt-in consumer panels, not API outputs or synthetic estimates." },
  { icon: RefreshCw, title: "Multi-Engine Prompt Aggregation", desc: "Aggregates prompts from ChatGPT, Gemini, Claude, and Perplexity in one view, with additional engines coming soon." },
  { icon: BarChart3, title: "Advanced Data Science", desc: "Our pipeline cleans and processes this corpus to train models that accurately map human-AI conversations." },
  { icon: Shield, title: "Enterprise-Standard Security", desc: "All prompt data is anonymized, aggregated, and scrubbed of PII. Fully compliant with GDPR and CCPA." },
  { icon: RefreshCw, title: "Data Freshness & Coverage", desc: "Weekly data refresh with less than one week latency. Multi-region coverage spanning the US, UK, Canada, Germany, France, and more." }
];

export default function PromptVolumesPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const handleGetDemo = () => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        router.push('/login');
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        router.push('/login');
        return;
      }
      router.push('/dashboard');
    });
  };

  const handleGetStarted = () => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        router.push('/signup');
        return;
      }
      router.push('/pricing');
    });
  };

  return (
    <div style={{
      background: "#080A0F",
      color: "#FFFFFF",
      fontFamily: "'Kumbh Sans', sans-serif",
      minHeight: "100vh",
      overflowX: "hidden"
    }}>
      {/* Floating Nav */}
      <header style={{
        position: "fixed",
        top: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: "32px",
        padding: "12px 24px",
        background: "rgba(8, 10, 15, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "60px",
        border: "1px solid rgba(255,255,255,0.06)"
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={22} height={22} style={{ borderRadius: '5px', objectFit: 'contain' }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#FFFFFF", letterSpacing: "-0.01em" }}>Grow Citable</span>
        </Link>
        <nav style={{ display: "flex", gap: "20px", fontSize: "0.8125rem", color: TEXT_MUTED }}>
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
          <Link href="/pricing" style={{ color: "inherit", textDecoration: "none" }}>Pricing</Link>
        </nav>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={handleGetDemo} style={{
            padding: "8px 18px",
            borderRadius: "40px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "#FFFFFF",
            fontSize: "0.8125rem",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s"
          }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseOut={e => e.currentTarget.style.background = "transparent"}
          >Log in</button>
          <button onClick={handleGetDemo} style={{
            padding: "8px 18px",
            borderRadius: "40px",
            border: "none",
            background: ACCENT,
            color: "#FFFFFF",
            fontSize: "0.8125rem",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 500,
            transition: "all 0.2s"
          }}
            onMouseOver={e => e.currentTarget.style.background = "#2563EB"}
            onMouseOut={e => e.currentTarget.style.background = ACCENT}
          >Get a Demo</button>
        </div>
      </header>

      {/* HERO */}
      <section style={{
        padding: "160px 48px 80px 48px",
        maxWidth: "1200px",
        margin: "0 auto",
        textAlign: "center",
        position: "relative"
      }}>
        <div style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "800px",
          background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "40px",
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.2)",
            fontSize: "0.75rem",
            color: ACCENT,
            marginBottom: "28px"
          }}>
            <BarChart3 size={14} />
            <span>Introducing Prompt Volumes</span>
          </div>

          <h1 style={{
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            margin: "0 auto 20px auto",
            maxWidth: "900px"
          }}>
            The keyword data your SEO tools don't have —{" "}
            <span style={{
              background: "linear-gradient(135deg, #60A5FA, #A78BFA, #34D399)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>pulled from millions of conversations</span> in answer engines
          </h1>

          <p style={{
            fontSize: "1.05rem",
            color: TEXT_SECONDARY,
            lineHeight: 1.6,
            maxWidth: "650px",
            margin: "0 auto 24px auto"
          }}>
            Prompt Volumes reveals the keywords and topics driving AI conversations across ChatGPT, Gemini, Claude, and Perplexity — so you can optimize your brand's visibility in the age of answer engines.
          </p>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "32px",
            marginBottom: "36px",
            flexWrap: "wrap"
          }}>
            {[
              { src: "/ai-logo/chatgpt.png", alt: "ChatGPT", width: 28 },
              { src: "/ai-logo/gemini.png", alt: "Gemini", width: 28 },
              { src: "/ai-logo/claude.png", alt: "Claude", width: 28 },
              { src: "/ai-logo/perplexity.png", alt: "Perplexity", width: 28 },
              { src: "/ai-logo/deepseek.png", alt: "DeepSeek", width: 28 },
              { src: "/ai-logo/grok.png", alt: "Grok", width: 28 },
            ].map((logo, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.5, transition: "opacity 0.2s" }}
                onMouseOver={e => e.currentTarget.style.opacity = "1"}
                onMouseOut={e => e.currentTarget.style.opacity = "0.5"}>
                <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.width} style={{ borderRadius: "6px", objectFit: "contain" }} />
                <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.5)" }}>{logo.alt}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "60px" }}>
            <button onClick={handleGetDemo} style={{
              padding: "14px 32px",
              borderRadius: "40px",
              border: "none",
              background: ACCENT,
              color: "#FFFFFF",
              fontSize: "0.9375rem",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
              onMouseOver={e => e.currentTarget.style.background = "#2563EB"}
              onMouseOut={e => e.currentTarget.style.background = ACCENT}
            >
              Get a Demo <ArrowRight size={16} />
            </button>
            <button onClick={handleGetStarted} style={{
              padding: "14px 32px",
              borderRadius: "40px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#FFFFFF",
              fontSize: "0.9375rem",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s"
            }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseOut={e => e.currentTarget.style.background = "transparent"}
            >Get Started</button>
          </div>

          {/* Three-step overview */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px",
            textAlign: "left",
            maxWidth: "900px",
            margin: "0 auto"
          }}>
            {[
              { num: "1", title: "Explore conversations", desc: "relevant to your brand across AI engines" },
              { num: "2", title: "Track brand visibility", desc: "how your brand appears in AI-generated answers" },
              { num: "3", title: "Improve brand presence", desc: "optimize content for AI citation and ranking" }
            ].map((step, i) => (
              <div key={i} style={{
                padding: "24px",
                borderRadius: "16px",
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                position: "relative"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "rgba(59,130,246,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: ACCENT,
                  marginBottom: "12px"
                }}>{step.num}</div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "4px" }}>{step.title}</div>
                <div style={{ fontSize: "0.8125rem", color: TEXT_MUTED }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOGO BAR */}
      <section style={{
        padding: "40px 48px",
        maxWidth: "1200px",
        margin: "0 auto",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "24px" }}>Real data affords real results</div>
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "48px",
          flexWrap: "wrap",
          opacity: 0.5
        }}>
          {["Rho", "MongoDB", "Golin", "Indeed", "G2", "Hexaware"].map((name, i) => (
            <span key={i} style={{ fontSize: "1.25rem", fontWeight: 300, color: "rgba(255,255,255,0.6)", letterSpacing: "0.02em" }}>{name}</span>
          ))}
        </div>
      </section>

      {/* SECTION: HOW IT WORKS */}
      <section style={{
        padding: "100px 48px",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)", fontWeight: 400, letterSpacing: "-0.02em", margin: "0 auto 16px auto" }}>
            Discover, track, and act on{" "}
            <span style={{ color: ACCENT }}>AI search demand</span>
          </h2>
          <p style={{ fontSize: "1rem", color: TEXT_SECONDARY, maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
            Understand how AI conversations differ from traditional search and find the prompts worth tracking in your category.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px"
        }}>
          {[
            { step: "01", title: "Discover Trends", desc: "AI isn't just another search engine — it's how humans naturally interact with technology. Understand the shift." },
            { step: "02", title: "Find Prompts Worth Tracking", desc: "Learn what people ask AI in your category and prioritize based on volume behind each topic." },
            { step: "03", title: "Track Performance", desc: "Monitor brand visibility and rank for the specific keywords and topics you care about." },
            { step: "04", title: "Take Action", desc: "Use real insights to get your brand surfaced by AI engines more often and more favorably." }
          ].map((item, i) => (
            <div key={i} style={{
              padding: "32px",
              borderRadius: "16px",
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              transition: "all 0.3s"
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; e.currentTarget.style.transform = "translateY(-2px)" }}
              onMouseOut={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = "translateY(0)" }}
            >
              <div style={{ fontSize: "2rem", fontWeight: 300, color: ACCENT, marginBottom: "16px", opacity: 0.6 }}>{item.step}</div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "8px" }}>{item.title}</h3>
              <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: KEYWORD FEATURES */}
      <section style={{
        padding: "100px 48px",
        background: "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.03) 50%, transparent 100%)"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 400, letterSpacing: "-0.02em", margin: "0 auto 16px auto" }}>
              Organize, visualize, and explore{" "}
              <span style={{
                background: "linear-gradient(135deg, #60A5FA, #A78BFA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>keyword relationships</span>
            </h2>
            <p style={{ fontSize: "1rem", color: TEXT_SECONDARY, maxWidth: "600px", margin: "0 auto" }}>
              Map keyword relationships, group terms by project, and slice data by platform, audience, or demographics.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} style={{
                  padding: "36px",
                  borderRadius: "20px",
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  transition: "all 0.3s"
                }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)"; e.currentTarget.style.background = "rgba(59,130,246,0.05)" }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = CARD_BG }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "rgba(59,130,246,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Icon size={20} color={ACCENT} />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 500, color: ACCENT }}>{f.metric}</div>
                      <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{f.metricLabel}</div>
                    </div>
                  </div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "6px" }}>{f.title}</h3>
                  <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Visual Placeholder: Keyword Hierarchy Graph */}
          <div style={{
            marginTop: "32px",
            padding: "48px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(139,92,246,0.05) 100%)",
            border: `1px solid ${BORDER}`,
            overflow: "hidden",
            position: "relative"
          }}>
            <div style={{ fontSize: "0.8125rem", color: TEXT_MUTED, marginBottom: "24px" }}>Interactive Keyword Hierarchy Visualization</div>
            <svg width="100%" height="200" viewBox="0 0 800 200" style={{ maxWidth: "800px", display: "block", margin: "0 auto" }}>
              <defs>
                <linearGradient id="line1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity="0.1" />
                  <stop offset="50%" stopColor={ACCENT} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Center node */}
              <circle cx="400" cy="100" r="28" fill="rgba(59,130,246,0.2)" stroke={ACCENT} strokeWidth="1.5" />
              <text x="400" y="105" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight={500}>SEO</text>

              {/* Branch circles */}
              {[
                { x: 180, y: 50, label: "On-Page SEO" },
                { x: 620, y: 50, label: "Technical SEO" },
                { x: 100, y: 160, label: "Content Strategy" },
                { x: 320, y: 160, label: "Link Building" },
                { x: 500, y: 160, label: "Local SEO" },
                { x: 700, y: 160, label: "E-E-A-T" }
              ].map((node, i) => (
                <React.Fragment key={i}>
                  <line x1="400" y1="100" x2={node.x} y2={node.y} stroke="rgba(59,130,246,0.2)" strokeWidth="1" />
                  <circle cx={node.x} cy={node.y} r="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight={400}>{node.label}</text>
                </React.Fragment>
              ))}

              {/* Sub-nodes */}
              {[
                { from: 180, fromY: 50, x: 120, y: 10, label: "Meta Tags" },
                { from: 180, fromY: 50, x: 240, y: 10, label: "Headings" },
                { from: 620, fromY: 50, x: 560, y: 10, label: "Core Web Vitals" },
                { from: 620, fromY: 50, x: 680, y: 10, label: "Schema" },
              ].map((sub, i) => (
                <React.Fragment key={`sub-${i}`}>
                  <line x1={sub.from} y1={sub.fromY + 18} x2={sub.x} y2={sub.y + 10} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <rect x={sub.x - 30} y={sub.y} width="60" height="20" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  <text x={sub.x} y={sub.y + 13} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7">{sub.label}</text>
                </React.Fragment>
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* SECTION: INTENT ANALYSIS */}
      <section style={{ padding: "100px 48px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 400, letterSpacing: "-0.02em", margin: "0 auto 16px auto" }}>
            Understand and meet the{" "}
            <span style={{ color: "#8B5CF6" }}>intent</span> behind every AI conversation
          </h2>
          <p style={{ fontSize: "1rem", color: TEXT_SECONDARY, maxWidth: "550px", margin: "0 auto" }}>
            Align your content strategy with the way real people discover, evaluate, and purchase through AI.
          </p>
        </div>

        {/* Intent sunburst chart */}
        <div style={{
          padding: "40px",
          borderRadius: "20px",
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          marginBottom: "32px",
          display: "flex",
          alignItems: "center",
          gap: "48px",
          flexWrap: "wrap"
        }}>
          <div style={{ flex: "1 1 300px" }}>
            <svg width="240" height="240" viewBox="0 0 240 240" style={{ display: "block", margin: "0 auto" }}>
              {/* Outer ring */}
              <circle cx="120" cy="120" r="115" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="20" strokeDasharray="60 30 100 40 70 40" />
              <circle cx="120" cy="120" r="90" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="20" strokeDasharray="80 30 70 50" />
              <circle cx="120" cy="120" r="65" fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth="20" strokeDasharray="90 40 50 40" />
              <circle cx="120" cy="120" r="40" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="20" strokeDasharray="100 30" />
              <circle cx="120" cy="120" r="8" fill="rgba(255,255,255,0.1)" />
              <text x="120" y="124" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">Intent</text>
              {/* Labels */}
              <text x="185" y="70" fill="rgba(59,130,246,0.7)" fontSize="8">Informational</text>
              <text x="38" y="85" fill="rgba(139,92,246,0.7)" fontSize="8">Commercial</text>
              <text x="38" y="170" fill="rgba(6,182,212,0.7)" fontSize="8">Conversational</text>
              <text x="170" y="175" fill="rgba(16,185,129,0.7)" fontSize="8">Generative</text>
            </svg>
          </div>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "16px" }}>Sub-Intent Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "How-to / Tutorial", pct: 34, color: ACCENT },
                { label: "Product Comparison", pct: 22, color: "#8B5CF6" },
                { label: "Definition / Explanation", pct: 18, color: "#06B6D4" },
                { label: "Recommendation", pct: 16, color: "#10B981" },
                { label: "Troubleshooting", pct: 10, color: "#F59E0B" }
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "4px" }}>
                    <span style={{ color: TEXT_SECONDARY }}>{item.label}</span>
                    <span style={{ color: item.color }}>{item.pct}%</span>
                  </div>
                  <div style={{ height: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${item.pct}%`, height: "100%", borderRadius: "4px", background: item.color, transition: "width 1s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {intentFeatures.map((f, i) => (
            <div key={i} style={{
              padding: "28px",
              borderRadius: "16px",
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${f.color}`
            }}>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "6px" }}>{f.title}</h3>
              <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: COMPETITIVE ANALYSIS */}
      <section style={{
        padding: "100px 48px",
        background: "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.03) 50%, transparent 100%)"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 400, letterSpacing: "-0.02em", margin: "0 auto 16px auto" }}>
              See how your brand stacks up against{" "}
              <span style={{ color: "#8B5CF6" }}>the competition</span>
            </h2>
            <p style={{ fontSize: "1rem", color: TEXT_SECONDARY, maxWidth: "550px", margin: "0 auto" }}>
              Analyze how your brand and competitors are cited across AI conversations.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {competitiveFeatures.map((f, i) => (
              <div key={i} style={{
                padding: "36px",
                borderRadius: "20px",
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                textAlign: "center",
                transition: "all 0.3s"
              }}
                onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ fontSize: "2.5rem", fontWeight: 500, color: "#8B5CF6", marginBottom: "4px" }}>{f.stat}</div>
                <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, marginBottom: "20px" }}>{f.statLabel}</div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "8px" }}>{f.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Competitive comparison table */}
          <div style={{
            marginTop: "40px",
            padding: "32px",
            borderRadius: "20px",
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            overflowX: "auto"
          }}>
            <div style={{ fontSize: "0.8125rem", color: TEXT_MUTED, marginBottom: "20px" }}>Competitive Citation Comparison</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: TEXT_MUTED, fontWeight: 400 }}>Keyword</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: TEXT_MUTED, fontWeight: 400 }}>Your Brand</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: TEXT_MUTED, fontWeight: 400 }}>Competitor A</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: TEXT_MUTED, fontWeight: 400 }}>Competitor B</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: TEXT_MUTED, fontWeight: 400 }}>AI Volume</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["SEO tools comparison", "Cited 3x", "Cited 12x", "Cited 8x", "45K prompts"],
                  ["Content optimization", "Cited 7x", "Cited 5x", "Cited 0x", "32K prompts"],
                  ["AI search visibility", "Cited 0x", "Cited 9x", "Cited 4x", "28K prompts"],
                  ["Keyword research AI", "Cited 2x", "Cited 6x", "Cited 11x", "22K prompts"]
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{
                        padding: "14px 16px",
                        color: j === 0 ? "#FFFFFF" : (cell === "Cited 0x" ? "#EF4444" : TEXT_SECONDARY),
                        fontWeight: j === 0 ? 500 : 400
                      }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION: DATA & TRUST */}
      <section style={{ padding: "100px 48px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 400, letterSpacing: "-0.02em", margin: "0 auto 16px auto" }}>
            Powered by{" "}
            <span style={{
              background: "linear-gradient(135deg, #34D399, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>best-in-class data</span>
          </h2>
          <p style={{ fontSize: "1rem", color: TEXT_SECONDARY, maxWidth: "550px", margin: "0 auto" }}>
            Built on real conversations, delivered with enterprise-grade trust.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{
                padding: "28px",
                borderRadius: "16px",
                background: CARD_BG,
                border: `1px solid ${BORDER}`
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(16,185,129,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "14px"
                }}>
                  <Icon size={18} color="#34D399" />
                </div>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>{item.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION: BLOG UPDATES */}
      <section style={{
        padding: "80px 48px",
        background: "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.03) 100%)"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 400, letterSpacing: "-0.02em", margin: "0" }}>Latest updates</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
            {[
              { title: "Introducing support for Claude", desc: "We're excited to announce support for Claude, a major new step in helping businesses understand how their products appear and perform across AI surfaces.", tag: "New Engine" },
              { title: "Prompt Volumes expansion: Now with Gemini, Claude, and Perplexity", desc: "Earlier this year, we launched Prompt Volumes in the U.S. with ChatGPT. Since then, brands have been using it to answer critical questions.", tag: "Expansion" }
            ].map((post, i) => (
              <div key={i} style={{
                padding: "32px",
                borderRadius: "16px",
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                cursor: "pointer",
                transition: "all 0.3s"
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"}
                onMouseOut={e => e.currentTarget.style.borderColor = BORDER}
              >
                <div style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(59,130,246,0.1)",
                  fontSize: "0.6875rem",
                  color: ACCENT,
                  marginBottom: "12px"
                }}>{post.tag}</div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "8px", lineHeight: 1.4 }}>{post.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>{post.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: FAQ */}
      <section style={{ padding: "100px 48px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 400, letterSpacing: "-0.02em", margin: "0" }}>Frequently asked questions</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {faqItems.map((faq, i) => (
            <div key={i} style={{
              borderRadius: "12px",
              border: `1px solid ${openFaq === i ? 'rgba(59,130,246,0.2)' : BORDER}`,
              background: openFaq === i ? 'rgba(59,130,246,0.04)' : CARD_BG,
              overflow: "hidden",
              transition: "all 0.2s"
            }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                width: "100%",
                padding: "18px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "none",
                border: "none",
                color: "#FFFFFF",
                fontSize: "0.875rem",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left"
              }}>
                <span>{faq.q}</span>
                <ChevronDown size={16} style={{
                  color: TEXT_MUTED,
                  transform: openFaq === i ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.2s",
                  flexShrink: 0
                }} />
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 20px 18px 20px", fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.7 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{
        padding: "100px 48px",
        textAlign: "center",
        background: "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.06) 100%)"
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 400, letterSpacing: "-0.02em", margin: "0 auto 16px auto" }}>
            Ready to see what AI is saying about your brand?
          </h2>
          <p style={{ fontSize: "1rem", color: TEXT_SECONDARY, marginBottom: "32px" }}>
            Get a demo and discover the prompts driving AI conversations in your category.
          </p>
          <button onClick={handleGetDemo} style={{
            padding: "14px 36px",
            borderRadius: "40px",
            border: "none",
            background: ACCENT,
            color: "#FFFFFF",
            fontSize: "0.9375rem",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 500,
            transition: "all 0.2s"
          }}
            onMouseOver={e => e.currentTarget.style.background = "#2563EB"}
            onMouseOut={e => e.currentTarget.style.background = ACCENT}
          >
            Get a Demo
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: "60px 48px 32px 48px",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        <div className="footer-grid" style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: "60px",
          marginBottom: "40px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={24} height={24} style={{ borderRadius: '5px', objectFit: 'contain' }} />
              <span style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.02em" }}>Grow Citable</span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: 0, maxWidth: "280px" }}>
              AI-powered SEO platform helping brands optimize and track their visibility across answer engines.
            </p>
          </div>
          {[
            { title: "Platform", links: ["Agents", "Prompt Volumes", "Agent Analytics", "Guides"] },
            { title: "Resources", links: ["Resource Center", "Help Center", "Blog", "Research Hub"] },
            { title: "Company", links: ["Enterprise", "Pricing", "Contact us", "AI Instructions"] }
          ].map((col, i) => (
            <div key={i}>
              <h4 style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{col.title}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {col.links.map((link, j) => (
                  <li key={j} style={{ fontSize: "0.8125rem", color: TEXT_MUTED, cursor: "pointer", transition: "color 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.color = "#FFFFFF"}
                    onMouseOut={e => e.currentTarget.style.color = TEXT_MUTED}
                  >{link}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          borderTop: `1px solid ${BORDER}`,
          paddingTop: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.2)"
        }}>
          <span>© 2026 Grow Citable. All rights reserved.</span>
          <div style={{ display: "flex", gap: "20px" }}>
            <span style={{ cursor: "pointer", transition: "color 0.2s" }}
              onMouseOver={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
              onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>Privacy Policy</span>
            <span style={{ cursor: "pointer", transition: "color 0.2s" }}
              onMouseOver={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
              onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
