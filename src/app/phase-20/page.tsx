'use client';

import React, { useState } from "react";
import { 
  PhasePageShell, 
  FormCard, 
  PremiumInput, 
  SubmitButton, 
  ErrorBox, 
  LoadingCard 
} from "@/components/PhasePageShell";
import { 
  Mic, 
  Volume2, 
  Sparkles, 
  MessageSquare, 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  Copy, 
  HelpCircle, 
  Play, 
  Activity, 
  Layers 
} from "lucide-react";

interface VoiceDialog {
  query: string;
  response: string;
}

interface AuditedSentence {
  original: string;
  difficulty: 'High' | 'Medium' | 'Low';
  reason: string;
  alternative: string;
}

import { auth } from "@/lib/firebase";

interface VoiceDialog {
  query: string;
  response: string;
}

interface AuditedSentence {
  original: string;
  difficulty: 'High' | 'Medium' | 'Low';
  reason: string;
  alternative: string;
}

interface GvoReport {
  voiceReadabilityIndex: number;
  pronunciationClarity: number;
  syntaxFlow: number;
  faqIntentMatch: number;
  acousticGroundingLevel: 'Excellent' | 'Good' | 'Sub-optimal' | 'Critical Bloat';
  avgSentenceLength: number;
  complexWordsPercentage: number;
  geminiLive: VoiceDialog;
  chatgptVoice: VoiceDialog;
  siri: VoiceDialog;
  sentenceAudits: AuditedSentence[];
  voiceInjections: string[];
}

export default function Phase20Page() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GvoReport | null>(null);
  
  const [activeAgent, setActiveAgent] = useState<'Gemini' | 'ChatGPT' | 'Siri'>('Gemini');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError(null);
    setData(null);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to run this voice search audit.");
      setLoading(false);
      return;
    }

    try {
      const tokenRes = await fetch("/api/consume-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: 2 })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.message || "Failed to consume tokens.");
      }

      const res = await fetch("/api/gvo-auditor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to complete voice search audit.");
      }
      setData(resData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const speakText = (text: string, id: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (isPlaying === id) {
        setIsPlaying(null);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsPlaying(null);
      utterance.onerror = () => setIsPlaying(null);
      setIsPlaying(id);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported on this browser.");
    }
  };

  const getAcousticColor = (level: string) => {
    switch (level) {
      case "Excellent": return "#10b981";
      case "Good": return "#3b82f6";
      case "Sub-optimal": return "#f59e0b";
      case "Critical Bloat": return "#ef4444";
      default: return "var(--grey-text)";
    }
  };

  return (
    <PhasePageShell
      phase={20}
      title="GVO Voice Search Auditor"
      badgeLabel="GEO Voice"
      badgeIcon={<Mic size={16} />}
      accentColor="#6d28d9"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        
        {/* Form Card Input */}
        <FormCard>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "var(--text-dark)" }}>Generative Voice Search Optimization</h3>
                <p style={{ margin: 0, fontSize: "12.5px", color: "var(--grey-text)" }}>Audit landing page copy for verbal clarity, rhythm, sentence lengths, and voice agent grounding.</p>
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <PremiumInput
                    label="Target Domain / URL"
                    type="text"
                    value={url}
                    onChange={setUrl}
                    placeholder="e.g. yourbrand.com"
                  />
                </div>
                <SubmitButton loading={loading} label="Audit Voice Grounding" loadingLabel="Synthesizing text rhythm & auditing voice profiles..." tokens={2} />
              </div>
            </div>
          </form>
        </FormCard>

        {error && <ErrorBox message={error} />}

        {loading && <LoadingCard message="Scraping copy, calculating syllable densities, auditing syntax flow, and simulating voice agents..." />}

        {/* Dashboard Results Panel */}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            
            {/* 1. Four Circular Progress Metrics Gauges */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              
              {/* Voice Readability */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{
                  position: "relative",
                  width: "74px",
                  height: "74px",
                  borderRadius: "50%",
                  background: `conic-gradient(#6d28d9 ${data.voiceReadabilityIndex}%, #F0EDE8 0)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <div style={{ position: "absolute", width: "60px", height: "60px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "850", color: "var(--text-dark)" }}>{data.voiceReadabilityIndex}%</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Voice Readability</span>
                  <span style={{ fontSize: "14px", fontWeight: "850", color: "var(--text-dark)", display: "block", lineHeight: "1.2" }}>
                    {data.voiceReadabilityIndex >= 85 ? "Fluid Speech" : data.voiceReadabilityIndex >= 65 ? "Understandable" : "Hard to Read"}
                  </span>
                </div>
              </div>

              {/* Pronunciation Clarity */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{
                  position: "relative",
                  width: "74px",
                  height: "74px",
                  borderRadius: "50%",
                  background: `conic-gradient(#10b981 ${data.pronunciationClarity}%, #F0EDE8 0)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <div style={{ position: "absolute", width: "60px", height: "60px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "850", color: "var(--text-dark)" }}>{data.pronunciationClarity}%</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Pronunciation Clarity</span>
                  <span style={{ fontSize: "14px", fontWeight: "850", color: "var(--text-dark)", display: "block", lineHeight: "1.2" }}>
                    {data.pronunciationClarity >= 80 ? "No Obstacles" : data.pronunciationClarity >= 60 ? "Mild Jargon" : "Robotic Stumbles"}
                  </span>
                </div>
              </div>

              {/* Syntax Flow */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{
                  position: "relative",
                  width: "74px",
                  height: "74px",
                  borderRadius: "50%",
                  background: `conic-gradient(#3b82f6 ${data.syntaxFlow}%, #F0EDE8 0)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <div style={{ position: "absolute", width: "60px", height: "60px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "850", color: "var(--text-dark)" }}>{data.syntaxFlow}%</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Syntax Rhythm</span>
                  <span style={{ fontSize: "14px", fontWeight: "850", color: "var(--text-dark)", display: "block", lineHeight: "1.2" }}>
                    {data.syntaxFlow >= 80 ? "Natural Cadence" : data.syntaxFlow >= 60 ? "Monotone" : "Fragmented"}
                  </span>
                </div>
              </div>

              {/* Conversational FAQ Match */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{
                  position: "relative",
                  width: "74px",
                  height: "74px",
                  borderRadius: "50%",
                  background: `conic-gradient(#eab308 ${data.faqIntentMatch}%, #F0EDE8 0)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <div style={{ position: "absolute", width: "60px", height: "60px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "850", color: "var(--text-dark)" }}>{data.faqIntentMatch}%</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>FAQ Intent Match</span>
                  <span style={{ fontSize: "14px", fontWeight: "850", color: "var(--text-dark)", display: "block", lineHeight: "1.2" }}>
                    {data.faqIntentMatch >= 80 ? "Direct Answer" : data.faqIntentMatch >= 60 ? "Indirect Info" : "No Direct Match"}
                  </span>
                </div>
              </div>

            </div>

            {/* 2. Extra Lexical Stats Checklist and Acoustic level */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "28px" }}>
              
              {/* Lexical Ratios */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: "800", color: "var(--text-dark)" }}>Auditory Lexical Statistics</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  
                  {/* Avg Sentence Length */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #FAFAF9", paddingBottom: "10px" }}>
                    <div>
                      <strong style={{ fontSize: "13px", color: "var(--text-dark)", display: "block" }}>Avg Sentence Length</strong>
                      <span style={{ fontSize: "11px", color: "var(--grey-text)" }}>Voice models prefer under 18 words</span>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: data.avgSentenceLength <= 18 ? "#10b981" : "#f59e0b" }}>
                      {data.avgSentenceLength} Words
                    </span>
                  </div>

                  {/* Complex Words ratio */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "13px", color: "var(--text-dark)", display: "block" }}>Complex Words Percentage</strong>
                      <span style={{ fontSize: "11px", color: "var(--grey-text)" }}>Percent of multi-syllable jargon words</span>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: data.complexWordsPercentage <= 15 ? "#10b981" : "#f59e0b" }}>
                      {data.complexWordsPercentage}%
                    </span>
                  </div>

                </div>
              </div>

              {/* Acoustic Grounding Rating */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", alignItems: "center", gap: "24px" }}>
                <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: `${getAcousticColor(data.acousticGroundingLevel)}0f`, display: "flex", alignItems: "center", justifyContent: "center", color: getAcousticColor(data.acousticGroundingLevel), flexShrink: 0 }}>
                  <Layers size={26} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Acoustic Grounding Rating</span>
                  <strong style={{ fontSize: "17px", fontWeight: "850", color: getAcousticColor(data.acousticGroundingLevel), display: "block", marginBottom: "2px" }}>
                    {data.acousticGroundingLevel}
                  </strong>
                  <span style={{ fontSize: "12.5px", color: "var(--grey-dark)", lineHeight: "1.4" }}>
                    {data.acousticGroundingLevel === "Excellent" ? "Your copy is optimized to be read aloud directly by conversational search agents." : "Contain dense phrases or syntax structures that degrade verbal summarization."}
                  </span>
                </div>
              </div>

            </div>

            {/* 3. Interactive Agent Dialogue Simulator (Massive Tab Screen) */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "800", color: "var(--text-dark)" }}>Voice Assistant Grounding Simulator</h3>
                <p style={{ margin: 0, fontSize: "12.5px", color: "var(--grey-text)" }}>Select a voice assistant and click play to listen to the simulated response.</p>
              </div>

              {/* Agent Tabs */}
              <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                {(['Gemini', 'ChatGPT', 'Siri'] as const).map((agent) => {
                  const isActive = activeAgent === agent;
                  const getTabColor = () => {
                    if (agent === 'Gemini') return '#3b82f6';
                    if (agent === 'ChatGPT') return '#10b981';
                    return '#e11d48';
                  };

                  return (
                    <button
                      key={agent}
                      onClick={() => setActiveAgent(agent)}
                      style={{
                        border: "none",
                        padding: "8px 18px",
                        borderRadius: "20px",
                        fontSize: "12.5px",
                        fontWeight: "800",
                        cursor: "pointer",
                        background: isActive ? getTabColor() : "rgba(0,0,0,0.03)",
                        color: isActive ? "#ffffff" : "var(--grey-dark)",
                        transition: "all 0.2s"
                      }}
                    >
                      {agent === 'Gemini' ? 'Gemini Live' : agent === 'ChatGPT' ? 'ChatGPT Voice' : 'Apple Siri'}
                    </button>
                  );
                })}
              </div>

              {/* Chat Interface Display */}
              <div style={{ background: "#FAFAF9", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* User Verbal Query */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "rgba(109,40,217,0.08)", border: "1px solid rgba(109,40,217,0.15)", borderRadius: "18px 18px 2px 18px", padding: "12px 18px", maxWidth: "70%" }}>
                    <span style={{ fontSize: "10px", color: "var(--grey-text)", display: "block", marginBottom: "4px", textAlign: "right" }}>USER (SPOKEN QUERY)</span>
                    <strong style={{ fontSize: "13px", color: "var(--text-dark)" }}>
                      "{activeAgent === 'Gemini' ? data.geminiLive.query : activeAgent === 'ChatGPT' ? data.chatgptVoice.query : data.siri.query}"
                    </strong>
                  </div>
                </div>

                {/* Assistant Verbal Response */}
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ 
                    width: "36px", 
                    height: "36px", 
                    borderRadius: "50%", 
                    background: activeAgent === 'Gemini' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : activeAgent === 'ChatGPT' ? '#10b981' : '#e11d48',
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff"
                  }}>
                    <Volume2 size={16} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "2px 18px 18px 18px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <span style={{ fontSize: "10px", color: "var(--grey-text)", display: "block", marginBottom: "2px" }}>
                          {activeAgent === 'Gemini' ? 'GEMINI LIVE' : activeAgent === 'ChatGPT' ? 'CHATGPT VOICE' : 'APPLE SIRI'} RESPONSE
                        </span>
                        <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.6", color: "var(--text-dark)" }}>
                          {activeAgent === 'Gemini' ? data.geminiLive.response : activeAgent === 'ChatGPT' ? data.chatgptVoice.response : data.siri.response}
                        </p>
                      </div>

                      {/* Text-to-speech Speak button */}
                      <div>
                        <button
                          onClick={() => speakText(
                            activeAgent === 'Gemini' ? data.geminiLive.response : activeAgent === 'ChatGPT' ? data.chatgptVoice.response : data.siri.response,
                            activeAgent
                          )}
                          style={{
                            border: "none",
                            background: isPlaying === activeAgent ? "#ef4444" : "rgba(109,40,217,0.08)",
                            color: isPlaying === activeAgent ? "#ffffff" : "#6d28d9",
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s"
                          }}
                        >
                          <Play size={10} style={{ fill: isPlaying === activeAgent ? "#ffffff" : "#6d28d9" }} />
                          {isPlaying === activeAgent ? "Stop Audio" : "Listen Verbal Output"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 4. Tongue Twisters & Hard Sentences Audited Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "28px" }}>
              
              {/* Audited Speech obstacle sentences */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "800", color: "var(--text-dark)" }}>Verbal Pronunciation Auditing</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--grey-text)" }}>Copy elements triggering robotic synthesis or speech bottlenecks.</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {data.sentenceAudits.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "8px", 
                        padding: "16px",
                        background: item.difficulty === "Low" ? "rgba(16,185,129,0.01)" : item.difficulty === "Medium" ? "rgba(245,158,11,0.01)" : "rgba(239,68,68,0.01)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ 
                          fontSize: "10.5px", 
                          fontWeight: "850", 
                          color: item.difficulty === "Low" ? "#10b981" : item.difficulty === "Medium" ? "#f59e0b" : "#ef4444",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          <AlertTriangle size={14} />
                          {item.difficulty.toUpperCase()} SPEECH OBSTACLE
                        </span>
                      </div>
                      
                      {/* Original text */}
                      <p style={{ margin: "0 0 10px 0", fontSize: "12.5px", color: "var(--grey-dark)", fontStyle: "italic", lineHeight: "1.4" }}>
                        "{item.original}"
                      </p>

                      {/* Reason */}
                      <div style={{ fontSize: "11px", color: "#d97706", marginBottom: "10px" }}>
                        <strong>Obstacle:</strong> {item.reason}
                      </div>

                      {/* Alternative rewrite */}
                      <div style={{ borderTop: "1px solid #FAFAF9", paddingTop: "8px", fontSize: "12.5px", color: "var(--text-dark)", lineHeight: "1.4", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <ArrowRight size={14} style={{ color: "#10b981", marginTop: "2px", flexShrink: 0 }} />
                        <div>
                          <strong style={{ fontWeight: "750" }}>Verbal Alternative:</strong> {item.alternative}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GVO Injection summary blocks */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "800", color: "var(--text-dark)" }}>GVO Voice Injections</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--grey-text)" }}>Short verbal definitions to paste onto your header sections.</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {data.voiceInjections.map((injection, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        background: "#FAFAF9", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "8px", 
                        padding: "16px",
                        position: "relative"
                      }}
                    >
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Injection {i + 1}</span>
                      <p style={{ margin: "0 0 12px 0", fontSize: "12px", lineHeight: "1.5", color: "var(--grey-dark)" }}>
                        {injection}
                      </p>
                      
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => copyToClipboard(injection, i)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            border: "none",
                            background: copiedIndex === i ? "#10b981" : "rgba(109,40,217,0.08)",
                            color: copiedIndex === i ? "#ffffff" : "#6d28d9",
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          {copiedIndex === i ? <Check size={11} /> : <Copy size={11} />}
                          {copiedIndex === i ? "Copied" : "Copy injection"}
                        </button>

                        <button
                          onClick={() => speakText(injection, `inj-${i}`)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            border: "none",
                            background: isPlaying === `inj-${i}` ? "#ef4444" : "rgba(0,0,0,0.03)",
                            color: isPlaying === `inj-${i}` ? "#ffffff" : "var(--grey-dark)",
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          <Volume2 size={11} />
                          {isPlaying === `inj-${i}` ? "Stop" : "Listen Speak"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </PhasePageShell>
  );
}
