'use client';

import React from 'react';
import FooterPage from '@/components/FooterPage';
import { Target, Cpu, TrendingUp, Sparkles, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  const handleCTAClick = () => {
    const storedUserId = localStorage.getItem('gc_userId');
    if (storedUserId) {
      router.push('/dashboard');
    } else {
      router.push('/signup');
    }
  };

  return (
    <FooterPage
      title="The future of search visibility"
      subtitle="Grow Citable is building the intelligence layer for Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO)."
      accentColor="#7C5CFF"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
        
        {/* Mission Section */}
        <div className="about-card" style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '24px',
          padding: '40px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle light glow */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(124, 92, 255, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="about-badge" style={{
                background: 'rgba(124, 92, 255, 0.1)',
                border: '1px solid rgba(124, 92, 255, 0.2)',
                color: '#9E86FF',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '4px 10px',
                borderRadius: '99px'
              }}>
                Our Mission
              </span>
            </div>
            
            <h2 style={{ fontSize: '24px', fontWeight: 550, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              Transitioning from SEO to AEO
            </h2>
            
            <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: '1.7', margin: 0 }}>
              Search engine traffic is undergoing a generational shift. With search engines directly summarizing answers using large language models, brands can no longer rely solely on click-throughs. The goal is to ensure your brand is cited, quoted, and recommended directly inside the conversational responses of ChatGPT, Gemini, Claude, Perplexity, and other leading answer engines.
            </p>
            <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: '1.7', margin: 0 }}>
              Grow Citable provides the tools to audit your website, track citations in real-time, diagnose visibility gaps, and implement updates that keep you referenced in generative search answers.
            </p>
          </div>
        </div>

        {/* Pillars Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 500, color: '#FFFFFF', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
              Our Core Pillars
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.45)', margin: 0 }}>
              Building the most comprehensive optimization framework for generative search.
            </p>
          </div>

          <div className="about-grid">
            <div className="about-card" style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124, 92, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E86FF' }}>
                <Target size={20} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>Data-First Accuracy</h3>
              <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: '1.6', margin: 0 }}>
                We avoid simulations or heuristic guesses. We query live answer engine frameworks directly to retrieve actual quotes, placements, and references.
              </p>
            </div>

            <div className="about-card" style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124, 92, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E86FF' }}>
                <Cpu size={20} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>Model Agnostic</h3>
              <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: '1.6', margin: 0 }}>
                We track visibility across all major platforms—OpenAI ChatGPT, Google Gemini, Anthropic Claude, Perplexity AI, DeepSeek, and Microsoft Copilot.
              </p>
            </div>

            <div className="about-card" style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124, 92, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E86FF' }}>
                <TrendingUp size={20} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>Actionable Audits</h3>
              <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: '1.6', margin: 0 }}>
                Understanding visibility is only half the battle. We translate audits into concrete content guidelines and structured site architecture suggestions.
              </p>
            </div>
          </div>
        </div>

        {/* AI Agents Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 500, color: '#FFFFFF', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
              Driven by AI Agents
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.45)', margin: 0 }}>
              The specialized sub-agents running behind the scenes to automate your optimization workflow.
            </p>
          </div>

          <div className="about-grid">
            <div className="about-card" style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 92, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E86FF', flexShrink: 0 }}>
                  <Sparkles size={16} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>Discovery Agent</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: '1.6', margin: 0 }}>
                Crawls and scans your website to identify technical SEO bottlenecks, missing schema tags, semantic formatting issues, and crawl warnings.
              </p>
            </div>

            <div className="about-card" style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 92, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E86FF', flexShrink: 0 }}>
                  <ShieldCheck size={16} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>Visibility Analyst</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: '1.6', margin: 0 }}>
                Monitors answer engines dynamically, tracking mention shares, quoting frequency, and positive or negative sentiment metrics.
              </p>
            </div>

            <div className="about-card" style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 92, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E86FF', flexShrink: 0 }}>
                  <Zap size={16} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>Citation Optimizer</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: '1.6', margin: 0 }}>
                Analyzes reference listings and maps out content addition guidelines to insert your brand into targeted answer response paths.
              </p>
            </div>
          </div>
        </div>

        {/* SEO vs GEO Comparison Table Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="about-badge" style={{
              background: 'rgba(124, 92, 255, 0.08)',
              border: '1px solid rgba(124, 92, 255, 0.15)',
              color: '#9E86FF',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '4px 10px',
              borderRadius: '99px'
            }}>
              Comparing Paradigms
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: 500, color: '#FFFFFF', margin: '16px 0 12px 0', letterSpacing: '-0.02em' }}>
              Grow Citable vs Traditional SEO
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.45)', margin: '0 auto', maxWidth: '650px', lineHeight: '1.6' }}>
              Conversational answer engines construct dynamic responses instead of linking to pages. Legacy keyword tracking tools are blind to this shift.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '16px',
            overflow: 'hidden',
            width: '100%'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.4fr 1.4fr',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '16px 24px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              gap: '20px'
            }}>
              <span>Capability</span>
              <span>Traditional SEO Tools</span>
              <span style={{ color: '#9E86FF' }}>Grow Citable GEO Framework</span>
            </div>

            {[
              {
                cap: "Primary Target Metric",
                seo: "Blue Link Rankings (SERP Positions)",
                geo: "AI Citations, References, & Brand Mentions Count"
              },
              {
                cap: "Crawl Engine Scope",
                seo: "Google Bot & Bing Bot indexes",
                geo: "ChatGPT, Gemini, Claude, Perplexity AI, Copilot"
              },
              {
                cap: "Diagnostic Mechanics",
                seo: "Keyword density, search volumes, legacy backlink counts",
                geo: "Live prompt grounding simulations & model context audits"
              },
              {
                cap: "Optimization Target",
                seo: "Generic metadata tags and link building schemas",
                geo: "Factual information density, semantic FAQs, crawl allowance configurations"
              },
              {
                cap: "Attribution Tracking",
                seo: "Referral links and organic landing page parameters",
                geo: "AI Agent search context source URL grounding attribution"
              }
            ].map((row, idx) => (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.4fr 1.4fr',
                borderBottom: idx === 4 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)',
                padding: '20px 24px',
                fontSize: '13.5px',
                lineHeight: '1.6',
                gap: '20px'
              }}>
                <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{row.cap}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>{row.seo}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.75)' }}>{row.geo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Card Section */}
        <div className="about-card" style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(124, 92, 255, 0.08) 0%, rgba(0, 0, 0, 0) 80%), rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(124, 92, 255, 0.15)',
          borderRadius: '24px',
          padding: '60px 40px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          <h2 style={{ fontSize: '32px', fontWeight: 550, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', maxWidth: '600px' }}>
            Ready to track your presence in generative search?
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.55)', margin: 0, maxWidth: '500px', lineHeight: '1.6' }}>
            Analyze your site today and see how ChatGPT, Gemini, and Claude view your brand authority.
          </p>
          <button
            onClick={handleCTAClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '99px',
              background: '#FFFFFF',
              color: '#090A0F',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            Get Started
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </FooterPage>
  );
}
