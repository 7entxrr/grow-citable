"use client";

import FooterPage from "@/components/FooterPage";
import { Calendar, ArrowRight, Clock, User } from "lucide-react";
import React from "react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

const posts = [
  { title: "Introducing support for Claude", desc: "We're excited to announce support for Claude, a major step in helping businesses understand their products across AI surfaces.", tag: "Product", date: "Mar 15, 2026", author: "Team" },
  { title: "Prompt Volumes expansion: Now with Gemini, Claude, and Perplexity", desc: "Launching Prompt Volumes in the U.S. with ChatGPT was just the beginning. Now supporting three additional engines.", tag: "Feature", date: "Mar 1, 2026", author: "Team" },
  { title: "The State of AI Search in 2026", desc: "Our annual report on how brands appear across AI engines, with data from millions of analyzed conversations.", tag: "Research", date: "Feb 20, 2026", author: "Research" },
  { title: "How to Optimize Your Content for Perplexity", desc: "Perplexity cites sources differently than ChatGPT. Learn the key differences and adapt your content strategy.", tag: "Guide", date: "Feb 10, 2026", author: "Content" },
  { title: "Competitive Analysis in the Age of AI Search", desc: "Traditional SEO competitive analysis is dead. Here's how to analyze your competition in AI-powered search.", tag: "Insights", date: "Jan 28, 2026", author: "Strategy" },
  { title: "Understanding E-E-A-T in AI Citations", desc: "Google's E-E-A-T framework is now directly relevant to how AI engines evaluate and cite your content.", tag: "Guide", date: "Jan 15, 2026", author: "SEO" },
];

export default function BlogPage() {
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const tags = Array.from(new Set(posts.map(p => p.tag)));
  const filtered = selectedTag ? posts.filter(p => p.tag === selectedTag) : posts;

  return (
    <FooterPage
      title="Blog"
      subtitle="Insights, research, and guides on AI visibility optimization."
      accentColor="#3B82F6"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {/* Tags */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => setSelectedTag(null)} style={{
            padding: "8px 16px", borderRadius: "40px", border: `1px solid ${selectedTag === null ? "#3B82F6" : BORDER}`,
            background: selectedTag === null ? "rgba(59,130,246,0.15)" : "transparent",
            color: selectedTag === null ? "#3B82F6" : TEXT_SECONDARY,
            fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s"
          }}>All</button>
          {tags.map(tag => (
            <button key={tag} onClick={() => setSelectedTag(tag)} style={{
              padding: "8px 16px", borderRadius: "40px", border: `1px solid ${selectedTag === tag ? "#3B82F6" : BORDER}`,
              background: selectedTag === tag ? "rgba(59,130,246,0.15)" : "transparent",
              color: selectedTag === tag ? "#3B82F6" : TEXT_SECONDARY,
              fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s"
            }}>{tag}</button>
          ))}
        </div>

        {/* Posts grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
          {filtered.map((post, i) => (
            <div key={i} style={{
              padding: "28px", borderRadius: "16px",
              background: CARD_BG, border: `1px solid ${BORDER}`,
              cursor: "pointer", transition: "all 0.3s",
              display: "flex", flexDirection: "column"
            }}
              onMouseOver={e => e.currentTarget.style.borderColor = "#3B82F660"}
              onMouseOut={e => e.currentTarget.style.borderColor = BORDER}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "0.6875rem", padding: "4px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>{post.tag}</span>
                <span style={{ fontSize: "0.6875rem", color: TEXT_MUTED, display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={10} /> {post.date}
                </span>
              </div>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "8px", lineHeight: 1.4 }}>{post.title}</h3>
              <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: "0 0 auto 0" }}>{post.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: "0.75rem", color: TEXT_MUTED, display: "flex", alignItems: "center", gap: "4px" }}>
                  <User size={10} /> {post.author}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#3B82F6" }}>Read →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FooterPage>
  );
}
