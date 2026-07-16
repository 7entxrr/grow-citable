"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Check, ChevronDown } from "lucide-react";

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

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    company: "",
    companySize: "",
    source: "",
    isAgency: false
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) {
      alert("Please fill in your name and work email.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "contacts"), {
        fullName: formData.fullName,
        email: formData.email,
        company: formData.company,
        companySize: formData.companySize,
        source: formData.source,
        isAgency: formData.isAgency,
        createdAt: new Date().toISOString()
      });
      alert(`Thank you ${formData.fullName}! Your message has been sent to our sales team.`);
      setFormData({
        fullName: "",
        email: "",
        company: "",
        companySize: "",
        source: "",
        isAgency: false
      });
    } catch (err) {
      console.error("Error saving contact in Firestore:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "#090A0F",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "16px",
    color: "#FFFFFF",
    fontSize: "0.9375rem",
    outline: "none"
  };

  return (
    <div style={{
      backgroundColor: "#090A0F",
      color: "#FFFFFF",
      fontFamily: "'Kumbh Sans', sans-serif",
      minHeight: "100vh",
      overflowX: "hidden",
      position: "relative"
    }}>

      {/* 1. Translucent Nav Bar */}
      <header style={{
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
      }}>
        {/* Left: Logo */}
        <Link href="/home" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={28} height={28} style={{ borderRadius: '6px', objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>Grow Citable</span>
          </div>
        </Link>

        {/* Center: Pill Links */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.02)",
          padding: "4px 8px",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.03)"
        }}>
          <Link href="/home" style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}>Home</span>
          </Link>
          <Link href="/home" style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}>About</span>
          </Link>
          <Link href="/home" style={{ textDecoration: "none", color: "inherit" }}>
            <span
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }}
              onMouseOver={e => e.currentTarget.style.color = "white"}
              onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
            >
              Features
            </span>
          </Link>
          <Link href="/pricing" style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}>Pricing</span>
          </Link>
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", padding: "8px 16px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}>Blog</span>
        </nav>

        {/* Right: CTA Button - Active state for Contact Page */}
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
              cursor: "pointer"
            }}
          >
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
            top: "96px", // positioned right below the nav bar
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
          {/* Top arrow tip pointing to "Features" link */}
          <div style={{
            position: "absolute",
            top: "-6px",
            left: "40.5%", // Aligned under the "Features" nav link
            width: "10px",
            height: "10px",
            backgroundColor: "#07080B",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
            transform: "rotate(45deg)"
          }} />

          {/* Main Grid Content */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.2fr",
            gap: "40px",
            marginBottom: "30px"
          }}>
            {/* Column 1: Resources */}
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

            {/* Column 2: Data & Research */}
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

            {/* Column 3: Marketing Engineer */}
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

                {/* SVG Venn Diagram Illustration */}
                <div style={{
                  display: "flex", justifyContent: "center", alignItems: "center", height: "140px",
                  marginTop: "20px", position: "relative"
                }}>
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

          {/* Bottom links */}
          <div style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "20px",
            display: "flex",
            gap: "24px",
            justifyContent: "flex-start"
          }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#FFFFFF", cursor: "pointer" }} onMouseOver={e => e.currentTarget.style.color = "#7C5CFF"} onMouseOut={e => e.currentTarget.style.color = "#FFFFFF"}>Help Center</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#FFFFFF", cursor: "pointer" }} onMouseOver={e => e.currentTarget.style.color = "#7C5CFF"} onMouseOut={e => e.currentTarget.style.color = "#FFFFFF"}>Developer Docs</span>
          </div>
        </div>
      )}

      {/* 2. Main Split Grid Content */}
      <main style={{
        maxWidth: "1100px",
        margin: "180px auto 120px auto",
        padding: "0 24px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "80px",
        alignItems: "start",
        textAlign: "left"
      }}>
        {/* Left Column: Context & Testimonial */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Contact sales</span>

          <h1 style={{
            fontSize: "2.75rem",
            fontWeight: 600,
            margin: "16px 0 24px 0",
            lineHeight: "1.15",
            letterSpacing: "-0.02em"
          }}>
            Talk to our Sales team
          </h1>

          <p style={{
            fontSize: "1.05rem",
            color: "rgba(255,255,255,0.55)",
            lineHeight: "1.6",
            margin: "0 0 36px 0"
          }}>
            Connect with our sales team to explore how we can support your use case.
          </p>

          {/* Checklist */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "56px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.9375rem" }}>
              <span style={{
                width: "22px", height: "22px", borderRadius: "50%", background: "rgba(124, 92, 255, 0.15)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Check size={12} color="#9C85FF" />
              </span>
              <span>Demo of the Grow Citable platform</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.9375rem" }}>
              <span style={{
                width: "22px", height: "22px", borderRadius: "50%", background: "rgba(124, 92, 255, 0.15)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Check size={12} color="#9C85FF" />
              </span>
              <span>Custom report of your brand's visibility</span>
            </div>
          </div>

          {/* Testimonial Quote block */}
          <div style={{
            borderLeft: "2px solid rgba(255,255,255,0.1)",
            paddingLeft: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}>
            <p style={{
              fontSize: "1.25rem",
              fontWeight: 500,
              color: "#FFFFFF",
              lineHeight: "1.6",
              margin: 0
            }}>
              “ Identifying and analyzing LLM insights for AEO has been a key priority for the Ramp team. Grow Citable allowed us to uncover behavioral patterns that traditional SEO tools couldn't fully capture. ”
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(255,255,255,0.15)", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700
              }}>
                AN
              </div>
              <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)" }}>
                <strong style={{ color: "#FFFFFF", fontWeight: 600 }}>Ashley Nguyen</strong>, SEO Strategist at Ramp
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Dark Form Card */}
        <div style={{
          background: "#12131A",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 30px 0" }}>How can we help?</h3>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Input fields */}
            <div>
              <input
                type="text"
                required
                placeholder="Full name *"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <input
                type="email"
                required
                placeholder="Work email *"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <input
                type="text"
                required
                placeholder="Company *"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <input
                type="text"
                required
                placeholder="Company size *"
                value={formData.companySize}
                onChange={e => setFormData({ ...formData, companySize: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <textarea
                required
                placeholder="How did you hear about Grow Citable? *"
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value })}
                rows={4}
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            {/* Checkbox */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
              <input
                type="checkbox"
                id="isAgency"
                checked={formData.isAgency}
                onChange={e => setFormData({ ...formData, isAgency: e.target.checked })}
                style={{
                  width: "16px", height: "16px", accentColor: "#7C5CFF", cursor: "pointer"
                }}
              />
              <label htmlFor="isAgency" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                We're an agency
              </label>
            </div>

            {/* Form Footer */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px"
            }}>
              <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.4)" }}>
                You can also email us at our <strong style={{ textDecoration: "underline", color: "#FFFFFF", cursor: "pointer" }}>sales email</strong>
              </span>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: submitting ? "#1A1B24" : (formData.fullName && formData.email ? "#7C5CFF" : "#1A1B24"),
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 24px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s",
                  opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? "Sending..." : "Send message"}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 3. Footer Section */}
      <footer style={{
        background: "#000000",
        color: "#FFFFFF",
        padding: "100px 48px 60px 48px",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)"
      }}>
        {/* Main Grid */}
        <div className="footer-grid" style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1fr 1.2fr",
          gap: "60px",
          marginBottom: "80px"
        }}>
          {/* Column 1: Logo */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: "260px" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={24} height={24} style={{ borderRadius: "5px", objectFit: "contain" }} />
              <span style={{ fontSize: "1.25rem", fontWeight: 550, letterSpacing: "-0.02em" }}>Grow Citable</span>
            </div>
          </div>

          {/* Column 2: Platform & Solutions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "50px" }}>
            {/* Platform links */}
            <div>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 400, color: "#FFFFFF", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Platform</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                {["Aim", "Agents", "Prompt Volumes", "Agent Analytics", "Answer Engine Insights", "Shopping", "Guides"].map((link) => (
                  <li key={link} style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"}>
                    {link}
                  </li>
                ))}
              </ul>
            </div>
            {/* Solutions links */}
            <div>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 400, color: "#FFFFFF", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Solutions</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                {["AEO Teams", "Content Teams", "PR & Brand Teams", "Agencies"].map((link) => (
                  <li key={link} style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"}>
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 3: Resources & Data */}
          <div style={{ display: "flex", flexDirection: "column", gap: "50px" }}>
            {/* Resources links */}
            <div>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 400, color: "#FFFFFF", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resources</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                {["Resource Center", "Help Center", "Customers", "Blog", "Brand Assets", "Engineering Blog", "AEO Report", "Integrations"].map((link) => (
                  <li key={link} style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"}>
                    {link}
                  </li>
                ))}
              </ul>
            </div>
            {/* Data links */}
            <div>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 400, color: "#FFFFFF", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Data</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                {["Grow Citable Index", "Research Hub"].map((link) => (
                  <li key={link} style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "white"} onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"}>
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 4: Company & Social */}
          <div style={{ display: "flex", flexDirection: "column", gap: "50px" }}>
            {/* Company links */}
            <div>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 400, color: "#FFFFFF", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}>Enterprise</li>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}>Pricing</li>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}>Contact us</li>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}>
                  <a href="/rules" style={{ color: "inherit", textDecoration: "none" }}>Rules & Policies</a>
                </li>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}>Media</li>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}>Vulnerability Reporting</li>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}>AI Instructions</li>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  Legal
                  <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>▼</span>
                </li>
              </ul>
            </div>
            {/* Social links */}
            <div>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 400, color: "#FFFFFF", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Social</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>𝕏</span> Twitter
                </li>
                <li style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontStyle: "italic", fontWeight: 400 }}>in</span> Linkedin
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          paddingTop: "30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.8125rem",
          color: "rgba(255, 255, 255, 0.3)"
        }}>
          <span>© 2026 Grow Citable</span>
          <span>All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

// Reusable styling objects
const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "12px",
  padding: "16px 20px",
  color: "#FFFFFF",
  fontSize: "0.9375rem",
  fontFamily: "'Kumbh Sans', sans-serif",
  outline: "none",
  transition: "border-color 0.2s"
};
