"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";

const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Agents", href: "/agents" },
      { label: "Prompt Volumes", href: "/prompt-volumes" },
      { label: "Agent Analytics", href: "/agent-analytics" },
      { label: "Guides", href: "/guides" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Resource Center", href: "/resource-center" },
      { label: "Help Center", href: "/help-center" },
      { label: "Blog", href: "/blog" },
      { label: "Grow Citable Index", href: "/grow-citable-index" },
      { label: "Research Hub", href: "/research-hub" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Enterprise", href: "/enterprise" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact us", href: "/contact" },
      { label: "Rules & Policies", href: "/rules" },
      { label: "AI Instructions", href: "/ai-instructions" },
    ],
  },
];

function DropdownItem({ title, desc }: { title: string; desc: string }) {
  const [isHovered, setIsHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: "pointer",
        padding: "10px 16px",
        borderRadius: "12px",
        backgroundColor: isHovered ? "rgba(255, 255, 255, 0.05)" : "transparent",
        transition: "all 0.15s ease",
        marginLeft: "-16px",
        marginRight: "-16px"
      }}
    >
      <div style={{ fontSize: "0.8125rem", fontWeight: 400, color: "#FFFFFF", marginBottom: "2px" }}>
        {title}
      </div>
      <div style={{ fontSize: "0.6875rem", fontWeight: 300, color: "rgba(255, 255, 255, 0.4)" }}>
        {desc}
      </div>
    </div>
  );
}

export default function FooterPage({
  title,
  subtitle,
  children,
  accentColor = "#3B82F6",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleDashboardClick = () => {
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

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div style={{
      backgroundColor: "#090A0F",
      color: "#FFFFFF",
      fontFamily: "'Kumbh Sans', sans-serif",
      minHeight: "100vh",
      overflowX: "hidden",
      position: "relative"
    }}>
      {/* Header */}
      <header
        className="footer-page-header"
        style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 48px)",
          maxWidth: "1200px",
          height: "64px",
          background: "rgba(18, 19, 26, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "32px",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 24px",
          zIndex: 1000
        }}
      >
        <Link href="/home" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={28} height={28} style={{ borderRadius: '6px', objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>Grow Citable</span>
          </div>
        </Link>

        <nav
          className="footer-page-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.02)",
            padding: "4px 8px",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.03)"
          }}
        >
          <Link href="/home" style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}>Home</span>
          </Link>
          <Link href="/about" style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}>About</span>
          </Link>

          <Link href="/home" style={{ textDecoration: "none", color: "inherit" }}>
            <span
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#FFFFFF",
                background: "rgba(255, 255, 255, 0.08)",
                padding: "8px 16px",
                borderRadius: "20px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#7C5CFF" }} />
              Features
            </span>
          </Link>
          <Link href="/pricing" style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}>Pricing</span>
          </Link>
          <Link href="/blog" style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}>Blog</span>
          </Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleDashboardClick}
            style={{
              background: "#FFFFFF",
              color: "#090A0F",
              border: "none",
              borderRadius: "20px",
              padding: "10px 20px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.2s"
            }} onMouseOver={e => e.currentTarget.style.opacity = "0.9"} onMouseOut={e => e.currentTarget.style.opacity = "1"}>
              Dashboard
            </button>
        </div>
      </header>

      {/* Mega Dropdown Panel */}
      {showDropdown && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "fixed",
            top: "96px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 48px)",
            maxWidth: "1000px",
            backgroundColor: "#07080B",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "32px",
            zIndex: 1100,
            boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{
            position: "absolute",
            top: "-6px",
            left: "40.5%",
            width: "10px",
            height: "10px",
            backgroundColor: "#07080B",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
            transform: "rotate(45deg)"
          }} />

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.2fr",
            gap: "40px",
            marginBottom: "30px"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}>
              <span style={{ fontSize: "0.625rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Resources</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { t: "Customers", d: "Teams using Grow Citable" },
                  { t: "Integrations", d: "Connect your stack to Grow Citable" },
                  { t: "AEO Report", d: "Your brand's custom AEO analysis" },
                  { t: "Grow Citable University", d: "Courses, tutorials, and certifications" },
                  { t: "Agent Templates", d: "Ready to use agents to start fast" }
                ].map(item => (
                  <DropdownItem key={item.t} title={item.t} desc={item.d} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}>
              <span style={{ fontSize: "0.625rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Data & Research</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { t: "Resource Center", d: "Articles, events, webinars, and white papers" },
                  { t: "Research Hub", d: "Latest research and insights" },
                  { t: "Blog", d: "News and updates" },
                  { t: "Engineering Blog", d: "How Grow Citable is built" },
                  { t: "Grow Citable Index", d: "The most visible brands in AI Search" }
                ].map(item => (
                  <DropdownItem key={item.t} title={item.t} desc={item.d} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}>
              <span style={{ fontSize: "0.625rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Marketing Engineer</span>
              <div style={{
                background: "#0E0F14",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "24px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <h5 style={{ fontSize: "0.8125rem", fontWeight: 400, color: "#FFFFFF", margin: "0 0 6px 0" }}>Marketing Engineering Manifesto</h5>
                  <p style={{ fontSize: "0.6875rem", color: "rgba(255, 255, 255, 0.4)", margin: 0 }}>A new marketing discipline appears</p>
                </div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "140px", marginTop: "20px", position: "relative" }}>
                  <svg width="100%" height="130" viewBox="0 0 200 130">
                    <circle cx="70" cy="75" r="45" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
                    <text x="35" y="78" fill="rgba(255,255,255,0.3)" fontSize="6" fontWeight="bold" textAnchor="middle">Product</text>
                    <text x="35" y="86" fill="rgba(255,255,255,0.3)" fontSize="6" fontWeight="bold" textAnchor="middle">Marketing</text>
                    <circle cx="130" cy="75" r="45" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
                    <text x="165" y="78" fill="rgba(255,255,255,0.3)" fontSize="6" fontWeight="bold" textAnchor="middle">Content &</text>
                    <text x="165" y="86" fill="rgba(255,255,255,0.3)" fontSize="6" fontWeight="bold" textAnchor="middle">Social</text>
                    <circle cx="100" cy="50" r="45" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
                    <text x="100" y="22" fill="rgba(255,255,255,0.3)" fontSize="6" fontWeight="bold" textAnchor="middle">Growth & Demand</text>
                    <text x="100" y="30" fill="rgba(255,255,255,0.3)" fontSize="6" fontWeight="bold" textAnchor="middle">Gen</text>
                    <rect x="75" y="88" width="50" height="24" rx="4" fill="#07080B" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <text x="100" y="98" fill="#FFFFFF" fontSize="6" fontWeight="bold" textAnchor="middle">The</text>
                    <text x="100" y="106" fill="#FFFFFF" fontSize="6" fontWeight="bold" textAnchor="middle">Marketing Engineer</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "20px",
            display: "flex",
            gap: "24px",
            justifyContent: "flex-start"
          }}>
            <Link href="/help-center" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#FFFFFF", cursor: "pointer" }} onMouseOver={e => e.currentTarget.style.color = "#7C5CFF"} onMouseOut={e => e.currentTarget.style.color = "#FFFFFF"}>Help Center</span>
            </Link>
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#FFFFFF", cursor: "pointer" }} onMouseOver={e => e.currentTarget.style.color = "#7C5CFF"} onMouseOut={e => e.currentTarget.style.color = "#FFFFFF"}>Developer Docs</span>
          </div>
        </div>
      )}

      {/* Hero */}
      <section
        className="footer-page-hero"
        style={{
          padding: "160px 48px 80px 48px",
          maxWidth: "1200px",
          margin: "0 auto",
          textAlign: "center",
          position: "relative"
        }}
      >
        <div style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "800px",
          background: `radial-gradient(ellipse, ${accentColor}15 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{
            fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            margin: "0 auto 20px auto",
            maxWidth: "900px"
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: "1.05rem",
              color: TEXT_SECONDARY,
              lineHeight: 1.6,
              maxWidth: "650px",
              margin: "0 auto 40px auto"
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section
        className="footer-page-content"
        style={{
          padding: "0 48px 100px 48px",
          maxWidth: "1000px",
          margin: "0 auto"
        }}
      >
        {children}
      </section>

      {/* Footer */}
      <footer style={{
        padding: "60px 48px 32px 48px",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "60px",
            marginBottom: "40px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={24} height={24} style={{ borderRadius: "5px", objectFit: "contain" }} />
              <span style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.02em" }}>Grow Citable</span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: 0, maxWidth: "280px" }}>
              AI-powered SEO platform helping brands optimize and track their visibility across answer engines.
            </p>
          </div>
          {footerColumns.map((col, i) => (
            <div key={i}>
              <h4 style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{col.title}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {col.links.map((link, j) => (
                  <li key={j}>
                    <Link href={link.href} style={{ fontSize: "0.8125rem", color: TEXT_MUTED, cursor: "pointer", transition: "color 0.2s", textDecoration: "none" }}
                      onMouseOver={e => e.currentTarget.style.color = "#FFFFFF"}
                      onMouseOut={e => e.currentTarget.style.color = TEXT_MUTED}
                    >{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="footer-bottom-row"
          style={{
            borderTop: `1px solid ${BORDER}`,
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.2)"
          }}
        >
          <span>© 2026 Grow Citable. All rights reserved.</span>
          <div style={{ display: "flex", gap: "20px" }}>
            <Link href="/rules" style={{ color: "inherit", textDecoration: "none" }}>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseOver={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>Privacy Policy</span>
            </Link>
            <Link href="/rules" style={{ color: "inherit", textDecoration: "none" }}>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseOver={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>Terms of Service</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
