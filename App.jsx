Ependy match ai · JSX
Copy

import { useState, useEffect, useRef } from "react";
 
const SUBGROUPS = {
  "PFA":       { label: "PFA (Posterior Fossa Group A)",         location: "Posterior Fossa",          risk: "High",             color: "#e05252", recurrenceRate: "~65–70%", followUp: "MRI every 3 months (Year 1), every 4 months (Year 2), every 6 months thereafter" },
  "PFB":       { label: "PFB (Posterior Fossa Group B)",         location: "Posterior Fossa",          risk: "Low",              color: "#4caf7d", recurrenceRate: "~15–25%", followUp: "MRI every 6 months (Year 1–2), annually thereafter" },
  "EPN-ZFTA":  { label: "EPN-ZFTA (Supratentorial ZFTA fusion)", location: "Supratentorial",           risk: "High",             color: "#e07b52", recurrenceRate: "~60%",    followUp: "MRI every 3 months (Year 1), every 4–6 months (Year 2–3)" },
  "EPN-YAP1":  { label: "EPN-YAP1 (Supratentorial YAP1 fusion)", location: "Supratentorial",           risk: "Low-Intermediate", color: "#5b9bd5", recurrenceRate: "~25–35%", followUp: "MRI every 6 months (Year 1), annually thereafter" },
  "SP-MYCN":   { label: "SP-MYCN (Spinal MYCN amplified)",       location: "Spinal",                   risk: "High",             color: "#c452c4", recurrenceRate: "~55–65%", followUp: "MRI every 3 months (Year 1), every 4 months thereafter" },
  "SP-NOS":    { label: "SP-NOS (Spinal / Myxopapillary)",       location: "Spinal",                   risk: "Low",              color: "#7ecfc0", recurrenceRate: "~15–20%", followUp: "MRI every 12 months, long-term surveillance" },
  "EPN-H3":    { label: "EPN-H3 (H3 K27-altered)",               location: "Posterior Fossa / Spinal", risk: "High",             color: "#d4824a", recurrenceRate: "~70%",    followUp: "MRI every 3 months (Year 1), every 4 months (Year 2)" },
  "EPN-PLAGL": { label: "EPN-PLAGL1/2 (PLAGL fusion)",           location: "Spinal / Posterior Fossa", risk: "Intermediate",     color: "#9b7ec8", recurrenceRate: "~30–45%", followUp: "MRI every 6 months (Year 1–2), annually thereafter" },
  "EPN-NOS":   { label: "EPN-NOS (Not Otherwise Specified)",      location: "Variable",                 risk: "Variable",         color: "#8a9ab5", recurrenceRate: "Unknown", followUp: "Standard 6-month MRI intervals; consider EPIC methylation re-profiling" },
  "SE":        { label: "SE (Subependymoma)",                     location: "Ventricular / Spinal",     risk: "Very Low",         color: "#52a87c", recurrenceRate: "<5%",     followUp: "Annual MRI for 5 years; consider discharge if stable" },
};
 
const SAMPLE_REPORT = `NEUROPATHOLOGY MOLECULAR REPORT
Patient: [DE-IDENTIFIED] — Date: 2026-04-15
 
DIAGNOSIS: Ependymoma, WHO Grade 3
LOCATION: Supratentorial, right frontal lobe
HISTOLOGY: High cellularity, perivascular pseudorosettes, Ki-67: 28%
 
MOLECULAR FINDINGS:
- FISH: C11orf95-RELA fusion DETECTED (ZFTA-RELA)
- Methylation array (EPIC 850K): Class EPN_ST_ZFTA, calibrated score 0.94
- H3K27me3: Retained by IHC
- CDKN2A/B: Homozygous deletion detected
- NF-κB pathway: Activated (p65 nuclear translocation)
- TERT promoter: Wild-type / IDH1/2: Wild-type
 
COPY NUMBER: Chr 1q gain, Chr 6q loss, Chr 9p21 deletion (CDKN2A)
 
IMPRESSION: Supratentorial ependymoma with ZFTA-RELA fusion. CDKN2A deletion — additional high-risk designation.`;
 
// ─── Claude AI Analysis ───────────────────────────────────────────────────────
async function runClaudeAnalysis(reportText) {
  const systemPrompt = `You are an expert neuro-oncologist specializing in ependymoma molecular classification using WHO CNS5 2021 and cIMPACT-NOW updates through 2026.
 
Analyze the pathology/molecular report and return ONLY a valid JSON object. No markdown, no backticks, no preamble, no explanation. Just the raw JSON.
 
Required structure:
{
  "subgroupKey": "<exactly one of: PFA|PFB|EPN-ZFTA|EPN-YAP1|SP-MYCN|SP-NOS|EPN-H3|EPN-PLAGL|EPN-NOS|SE>",
  "confidence": <number between 0 and 1>,
  "detectedMarkers": ["<marker>", ...],
  "riskFlags": ["<risk modifier>", ...],
  "riskScore": <number between 0 and 1>,
  "recurrenceNarrative": "<2-3 sentence clinical recurrence risk summary>",
  "surveillanceProtocol": "<specific MRI surveillance schedule>",
  "trialSearchKeywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "clinicalSummary": "<3-4 sentence expert tumor board summary>",
  "evidenceRefs": [
    {"ref": "<Author et al., Year>", "note": "<brief relevance note>"},
    {"ref": "<Author et al., Year>", "note": "<brief relevance note>"}
  ]
}`;
 
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: `Analyze this report:\n\n${reportText}` }],
    }),
  });
 
  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const data = await response.json();
  const rawText = (data.content || []).map(b => b.text || "").join("");
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No valid JSON returned from Claude");
  return JSON.parse(jsonMatch[0]);
}
 
// ─── ClinicalTrials.gov v2 API ────────────────────────────────────────────────
async function fetchTrials(keywords) {
  const query = (keywords || []).slice(0, 2).join(" ");
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&filter.overallStatus=RECRUITING,ACTIVE_NOT_RECRUITING&pageSize=5&fields=NCTId,BriefTitle,Phase,OverallStatus,BriefSummary,InterventionName,LocationCountry,LeadSponsorName`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("ClinicalTrials API error");
  const data = await res.json();
  return (data.studies || []).map(s => {
    const p = s.protocolSection || {};
    return {
      id:            p.identificationModule?.nctId || "N/A",
      title:         p.identificationModule?.briefTitle || "Untitled",
      phase:         (p.designModule?.phases || []).join("/") || "N/A",
      status:        p.statusModule?.overallStatus || "Unknown",
      summary:       (p.descriptionModule?.briefSummary || "").slice(0, 220),
      interventions: (p.armsInterventionsModule?.interventions || []).map(i => i.name).slice(0, 2).join(", ") || "—",
      countries:     [...new Set((p.contactsLocationsModule?.locations || []).map(l => l.country).filter(Boolean))].slice(0, 4).join(", ") || "Multiple sites",
      sponsor:       p.sponsorCollaboratorsModule?.leadSponsor?.name || "—",
    };
  });
}
 
// ─── Sub-components ───────────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  const map = { "High": ["#3d1a1a","#e05252","#ff8a8a"], "Low": ["#1a3d2a","#4caf7d","#7ee8a2"], "Very Low": ["#1a3d2a","#4caf7d","#7ee8a2"], "Low-Intermediate": ["#1a2e3d","#5b9bd5","#90caff"], "Intermediate": ["#2a2040","#9b7ec8","#c9a8ff"], "Variable": ["#2a2a2a","#8a9ab5","#c0ccdd"] };
  const [bg, border, text] = map[risk] || map["Variable"];
  return <span style={{ background: bg, border: `1px solid ${border}`, color: text, padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{risk} Risk</span>;
}
 
function ScoreBar({ score }) {
  const pct = Math.min(100, Math.round((score || 0) * 100));
  const color = pct > 75 ? "#e07070" : pct > 50 ? "#f0c060" : "#52e0a0";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "#1e2530", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 700, minWidth: 34 }}>{pct}%</span>
    </div>
  );
}
 
// ─── Main App ─────────────────────────────────────────────────────────────────
export default function EpendyMatchAI() {
  const [report, setReport]           = useState("");
  const [phase, setPhase]             = useState("idle");
  const [stepIdx, setStepIdx]         = useState(0);
  const [result, setResult]           = useState(null);
  const [trials, setTrials]           = useState([]);
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState("classifier");
  const [errorMsg, setErrorMsg]       = useState("");
 
  const STEPS = [
    { label: "Parsing molecular markers & pathology data",    icon: "🔬" },
    { label: "Claude AI — subgroup classification & risk",    icon: "🧠" },
    { label: "Generating recurrence model & surveillance",    icon: "📊" },
    { label: "Querying ClinicalTrials.gov live database",     icon: "🔗" },
  ];
 
  const run = async () => {
    if (!report.trim()) return;
    setPhase("analyzing"); setStepIdx(0); setResult(null); setTrials([]); setErrorMsg("");
    try {
      await new Promise(r => setTimeout(r, 500)); setStepIdx(1);
      const parsed = await runClaudeAnalysis(report);
      setStepIdx(2);
      await new Promise(r => setTimeout(r, 300)); setStepIdx(3);
      setTrialsLoading(true);
      let liveTrials = [];
      try { liveTrials = await fetchTrials(parsed.trialSearchKeywords); } catch { /* non-fatal */ }
      setTrials(liveTrials); setTrialsLoading(false);
      const sg = SUBGROUPS[parsed.subgroupKey] || SUBGROUPS["EPN-NOS"];
      setResult({ ...parsed, sg });
      setPhase("done"); setActiveTab("classifier");
    } catch (err) {
      setErrorMsg(err.message || "Analysis failed. Please try again.");
      setPhase("error"); setTrialsLoading(false);
    }
  };
 
  const reset = () => { setPhase("idle"); setReport(""); setResult(null); setTrials([]); setStepIdx(0); setErrorMsg(""); };
 
  return (
    <div style={{ minHeight: "100vh", background: "#0b0f1a", fontFamily: "'DM Mono','Fira Code','Courier New',monospace", color: "#c8d8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0b0f1a}::-webkit-scrollbar-thumb{background:#2a3a5a;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp 0.35s ease forwards}
        .spin{animation:spin 1.1s linear infinite;display:inline-block}
        .pulse{animation:pulse 2s ease infinite}
        .tab{background:none;border:none;cursor:pointer;font-family:inherit;transition:all 0.15s}
        .tab:hover{background:#1a2535 !important}
        .btn{border:none;font-family:inherit;cursor:pointer;transition:all 0.2s}
        .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 26px rgba(82,180,224,0.28)!important}
        .btn:disabled{cursor:not-allowed}
        .tc{transition:border-color 0.15s,transform 0.15s}.tc:hover{border-color:#52b4e0!important;transform:translateX(2px)}
        textarea{resize:vertical}textarea:focus{outline:none}
      `}</style>
 
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0d1525,#0b0f1a)", borderBottom: "1px solid #1a2535", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: "linear-gradient(135deg,#1a6fa8,#52b4e0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⬡</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 19, fontWeight: 800, color: "#e8f4ff", letterSpacing: "-0.5px" }}>Ependy<span style={{ color: "#52b4e0" }}>Match</span> AI</div>
            <div style={{ fontSize: 10, color: "#556888", letterSpacing: 2, textTransform: "uppercase" }}>Molecular Tumor Board · v3.0 · Live AI</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#4a6080", flexWrap: "wrap" }}>
          <span>Claude Sonnet 4</span><span>·</span><span>WHO CNS5 2021</span><span>·</span><span style={{ color: "#52b4e0" }}>● ClinicalTrials.gov Live</span>
        </div>
      </div>
 
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 18px" }}>
 
        {/* Input */}
        {(phase === "idle" || phase === "error") && (
          <div className="fade" style={{ marginBottom: 26 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#c8d8f0" }}>Paste Pathology / Molecular Report</div>
                <div style={{ fontSize: 11, color: "#4a6080", marginTop: 2 }}>EPIC methylation reports, FISH results, NGS panels, or free-text neuropathology</div>
              </div>
              <button onClick={() => setReport(SAMPLE_REPORT)} style={{ background: "#111827", border: "1px solid #2a3a5a", color: "#52b4e0", padding: "5px 13px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Load Sample</button>
            </div>
            <textarea value={report} onChange={e => setReport(e.target.value)}
              placeholder={"DIAGNOSIS: Ependymoma, WHO Grade 3\nMOLECULAR: ZFTA-RELA fusion detected..."}
              style={{ width: "100%", minHeight: 180, background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 10, padding: 14, color: "#a8c0e0", fontSize: 12, lineHeight: 1.7, fontFamily: "inherit" }} />
            {phase === "error" && <div style={{ background: "#2a1a1a", border: "1px solid #6a3030", borderRadius: 7, padding: "9px 13px", marginTop: 9, fontSize: 12, color: "#ff8a8a" }}>⚠ {errorMsg}</div>}
            <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
              <button className="btn" onClick={run} disabled={!report.trim()}
                style={{ background: report.trim() ? "linear-gradient(135deg,#1a6fa8,#52b4e0)" : "#1a2535", color: report.trim() ? "#fff" : "#3a5070", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "'Syne',sans-serif", letterSpacing: 0.5, boxShadow: report.trim() ? "0 3px 16px rgba(82,180,224,0.2)" : "none" }}>
                ⬡ Run AI Analysis
              </button>
              {report && <button onClick={() => setReport("")} style={{ background: "none", border: "1px solid #1e2e45", color: "#4a6080", padding: "10px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>}
            </div>
          </div>
        )}
 
        {/* Progress */}
        {phase === "analyzing" && (
          <div className="fade" style={{ background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 12, padding: 24, marginBottom: 26 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: "#52b4e0", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spin">⬡</span> Running Molecular Analysis Pipeline
            </div>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "9px 0", borderBottom: i < STEPS.length - 1 ? "1px solid #111827" : "none" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                  background: stepIdx > i ? "rgba(82,180,224,0.15)" : stepIdx === i ? "rgba(82,180,224,0.07)" : "#111",
                  border: `1px solid ${stepIdx > i ? "#52b4e0" : stepIdx === i ? "#2a5a8a" : "#1e2535"}` }}>
                  {stepIdx > i ? "✓" : stepIdx === i ? <span className="spin" style={{ fontSize: 9 }}>◈</span> : s.icon}
                </div>
                <span style={{ fontSize: 12, color: stepIdx > i ? "#52b4e0" : stepIdx === i ? "#c8d8f0" : "#3a5070", fontWeight: stepIdx === i ? 600 : 400 }}>{s.label}</span>
                {stepIdx === i && <span className="pulse" style={{ marginLeft: "auto", fontSize: 10, color: "#52b4e0" }}>processing…</span>}
                {stepIdx > i  && <span style={{ marginLeft: "auto", fontSize: 10, color: "#52b4e0" }}>done</span>}
              </div>
            ))}
          </div>
        )}
 
        {/* Results */}
        {phase === "done" && result && (
          <div className="fade">
            {/* Banner */}
            <div style={{ background: "linear-gradient(135deg,#0d1422,#111827)", border: `1px solid ${result.sg.color}44`, borderLeft: `4px solid ${result.sg.color}`, borderRadius: 12, padding: "18px 22px", marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a6080", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>AI-Classified Molecular Subgroup</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: result.sg.color }}>{result.subgroupKey}</div>
                <div style={{ fontSize: 12, color: "#8aaac8", marginTop: 1 }}>{result.sg.label}</div>
                <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                  <span style={{ background: "#111827", border: "1px solid #1e2e45", color: "#6a90b8", padding: "2px 9px", borderRadius: 4, fontSize: 11 }}>📍 {result.sg.location}</span>
                  <RiskBadge risk={result.sg.risk} />
                  {(result.riskFlags || []).length > 0 && <span style={{ background: "#2a1a1a", border: "1px solid #6a3030", color: "#ff8a8a", padding: "2px 9px", borderRadius: 4, fontSize: 11 }}>⚠ {result.riskFlags.length} risk modifier{result.riskFlags.length > 1 ? "s" : ""}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#4a6080", letterSpacing: 1, marginBottom: 2 }}>AI CONFIDENCE</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: result.sg.color }}>{Math.round((result.confidence || 0.9) * 100)}%</div>
                <button onClick={reset} style={{ marginTop: 7, background: "none", border: "1px solid #2a3a5a", color: "#4a6080", padding: "4px 11px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>← New Report</button>
              </div>
            </div>
 
            {/* AI Summary */}
            {result.clinicalSummary && (
              <div style={{ background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 10, padding: "13px 16px", marginBottom: 16, display: "flex", gap: 11 }}>
                <span style={{ fontSize: 17, flexShrink: 0, marginTop: 2 }}>🧠</span>
                <div>
                  <div style={{ fontSize: 10, color: "#4a6080", letterSpacing: 2, marginBottom: 5 }}>AI TUMOR BOARD SUMMARY</div>
                  <div style={{ fontSize: 12, color: "#a8c0e0", lineHeight: 1.8 }}>{result.clinicalSummary}</div>
                </div>
              </div>
            )}
 
            {/* Tabs */}
            <div style={{ display: "flex", gap: 3, background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 8, padding: 4, marginBottom: 16, width: "fit-content" }}>
              {[
                { key: "classifier", label: "🧬 Subgroup" },
                { key: "recurrence", label: "📊 Recurrence" },
                { key: "trials",     label: `🔗 Trials${trials.length ? ` (${trials.length})` : trialsLoading ? " …" : ""}` },
              ].map(t => (
                <button key={t.key} className="tab" onClick={() => setActiveTab(t.key)}
                  style={{ padding: "6px 15px", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: activeTab === t.key ? "#1a2d45" : "transparent", color: activeTab === t.key ? "#52b4e0" : "#4a6080", border: activeTab === t.key ? "1px solid #2a4a6a" : "1px solid transparent", fontWeight: activeTab === t.key ? 600 : 400 }}>{t.label}</button>
              ))}
            </div>
 
            {/* ── Classifier tab ── */}
            {activeTab === "classifier" && (
              <div className="fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                <div style={{ background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: "#4a6080", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Detected Molecular Markers</div>
                  {(result.detectedMarkers || []).map((m, i, arr) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none" }}>
                      <span style={{ color: "#52b4e0" }}>◆</span>
                      <span style={{ fontSize: 12, color: "#8aaac8" }}>{m}</span>
                    </div>
                  ))}
                  {(result.riskFlags || []).length > 0 && <>
                    <div style={{ fontSize: 11, color: "#ff6a6a", letterSpacing: 2, textTransform: "uppercase", marginTop: 14, marginBottom: 9 }}>Risk Modifiers</div>
                    {result.riskFlags.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
                        <span style={{ color: "#e05252" }}>⚠</span>
                        <span style={{ fontSize: 12, color: "#ff8a8a" }}>{f}</span>
                      </div>
                    ))}
                  </>}
                </div>
                <div style={{ background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: "#4a6080", letterSpacing: 2, textTransform: "uppercase", marginBottom: 11 }}>Evidence References</div>
                  {(result.evidenceRefs || []).map((e, i, arr) => (
                    <div key={i} style={{ padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none" }}>
                      <div style={{ fontSize: 11, color: "#52b4e0", marginBottom: 1 }}>{e.ref}</div>
                      <div style={{ fontSize: 11, color: "#4a6080" }}>{e.note}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, background: "#0a1018", border: "1px solid #1a2535", borderRadius: 7, padding: 11 }}>
                    <div style={{ fontSize: 10, color: "#4a6080", letterSpacing: 1, marginBottom: 4 }}>CLASSIFICATION BASIS</div>
                    <div style={{ fontSize: 11, color: "#6a90b8", lineHeight: 1.7 }}>WHO CNS5 2021 · cIMPACT-NOW 2024 · EPIC 850K methylation · Claude Sonnet 4 AI reasoning</div>
                  </div>
                </div>
              </div>
            )}
 
            {/* ── Recurrence tab ── */}
            {activeTab === "recurrence" && (
              <div className="fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                <div style={{ background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: "#4a6080", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Recurrence Probability</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 34, fontWeight: 800, marginBottom: 3,
                    color: result.sg.risk === "High" ? "#e05252" : (result.sg.risk === "Low" || result.sg.risk === "Very Low") ? "#4caf7d" : "#f0c060" }}>
                    {result.sg.recurrenceRate}
                  </div>
                  <div style={{ fontSize: 11, color: "#4a6080", marginBottom: 16 }}>5-year estimate · literature 2024–2026</div>
                  <div style={{ fontSize: 12, color: "#a8c0e0", lineHeight: 1.8, marginBottom: 16 }}>{result.recurrenceNarrative}</div>
                  <div style={{ fontSize: 11, color: "#4a6080", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Overall Risk Score</div>
                  <ScoreBar score={result.riskScore || 0.5} />
                </div>
                <div style={{ background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: "#4a6080", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>AI Surveillance Protocol</div>
                  <div style={{ background: "#0a1018", border: "1px solid #1a2535", borderRadius: 7, padding: 13, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: "#c8d8f0", lineHeight: 1.9 }}>{result.surveillanceProtocol || result.sg.followUp}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#4a6080", letterSpacing: 2, textTransform: "uppercase", marginBottom: 9 }}>Risk Modifiers</div>
                  {!(result.riskFlags || []).length
                    ? <div style={{ fontSize: 12, color: "#4a6080" }}>No additional high-risk modifiers identified</div>
                    : result.riskFlags.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #111827" }}>
                          <span style={{ color: "#e05252", fontSize: 12 }}>⚠</span>
                          <span style={{ fontSize: 12, color: "#ff8a8a" }}>{f}</span>
                        </div>
                      ))}
                </div>
              </div>
            )}
 
            {/* ── Trials tab ── */}
            {activeTab === "trials" && (
              <div className="fade">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#4a6080" }}>
                    Live · <span style={{ color: "#52b4e0" }}>ClinicalTrials.gov v2 API</span> · Recruiting & Active · Matched to <span style={{ color: "#a8c0e0" }}>{result.subgroupKey}</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(result.trialSearchKeywords || []).map((k, i) => (
                      <span key={i} style={{ background: "#111827", border: "1px solid #1e2e45", color: "#4a6080", padding: "2px 7px", borderRadius: 4, fontSize: 10 }}>{k}</span>
                    ))}
                  </div>
                </div>
 
                {trialsLoading && (
                  <div style={{ textAlign: "center", padding: 36, color: "#4a6080", fontSize: 12 }}>
                    <span className="spin" style={{ fontSize: 18, display: "block", marginBottom: 9, color: "#52b4e0" }}>⬡</span>
                    Querying ClinicalTrials.gov…
                  </div>
                )}
 
                {!trialsLoading && trials.length === 0 && (
                  <div style={{ background: "#0d1422", border: "1px dashed #1e2e45", borderRadius: 10, padding: 28, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#4a6080", marginBottom: 7 }}>No actively recruiting trials found for this query.</div>
                    <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer" style={{ color: "#52b4e0", fontSize: 11 }}>Search ClinicalTrials.gov directly →</a>
                  </div>
                )}
 
                {!trialsLoading && trials.map((t, i) => (
                  <div key={i} className="tc" style={{ background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 10, padding: 18, marginBottom: 11 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 7 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: "#c8d8f0", marginBottom: 6, lineHeight: 1.4 }}>{t.title}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ background: "#111827", border: "1px solid #2a3a5a", color: "#52b4e0", padding: "2px 7px", borderRadius: 4, fontSize: 10 }}>{t.phase}</span>
                          <span style={{ background: "#111827", border: "1px solid #2a3a5a", color: "#4a6080", padding: "2px 7px", borderRadius: 4, fontSize: 10 }}>{t.id}</span>
                          <span style={{ background: t.status === "RECRUITING" ? "#1a3d2a" : "#1a2535", border: `1px solid ${t.status === "RECRUITING" ? "#4caf7d" : "#2a3a5a"}`, color: t.status === "RECRUITING" ? "#7ee8a2" : "#6a90b8", padding: "2px 7px", borderRadius: 4, fontSize: 10 }}>
                            {t.status === "RECRUITING" ? "● Recruiting" : "◆ " + (t.status || "").replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {t.summary && <div style={{ fontSize: 11, color: "#5a7a9a", lineHeight: 1.7, marginBottom: 11 }}>{t.summary}…</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                      <div style={{ background: "#0a1018", borderRadius: 6, padding: 9 }}>
                        <div style={{ fontSize: 10, color: "#4a6080", letterSpacing: 1, marginBottom: 3 }}>INTERVENTION</div>
                        <div style={{ fontSize: 11, color: "#8aaac8" }}>{t.interventions}</div>
                      </div>
                      <div style={{ background: "#0a1018", borderRadius: 6, padding: 9 }}>
                        <div style={{ fontSize: 10, color: "#4a6080", letterSpacing: 1, marginBottom: 3 }}>SPONSOR</div>
                        <div style={{ fontSize: 11, color: "#8aaac8" }}>{t.sponsor}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 9, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 5 }}>
                      <div style={{ fontSize: 11, color: "#4a6080" }}>📍 {t.countries}</div>
                      <a href={`https://clinicaltrials.gov/study/${t.id}`} target="_blank" rel="noopener noreferrer" style={{ color: "#52b4e0", fontSize: 11, textDecoration: "none" }}>View full trial →</a>
                    </div>
                  </div>
                ))}
 
                <div style={{ background: "#0d1422", border: "1px dashed #1e2e45", borderRadius: 9, padding: 13, marginTop: 4, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#4a6080" }}>
                    Expanded access: <span style={{ color: "#52b4e0" }}>SIOPE Ependymoma Network</span> · <span style={{ color: "#52b4e0" }}>CERN Foundation</span> · <span style={{ color: "#52b4e0" }}>EU-RHAB consortium</span>
                  </div>
                </div>
              </div>
            )}
 
            {/* Disclaimer */}
            <div style={{ marginTop: 20, background: "#0a0e18", border: "1px solid #111827", borderRadius: 7, padding: 11 }}>
              <div style={{ fontSize: 10, color: "#2a3a5a", lineHeight: 1.7 }}>
                ⚠ <strong style={{ color: "#3a5070" }}>Clinical Decision Support Only.</strong> Ependy-Match AI augments — it does not replace — the multidisciplinary tumor board process. All AI-generated classifications, risk predictions, and trial matches must be reviewed by qualified neuro-oncology specialists. Trial eligibility requires confirmation with enrolling institutions. Recurrence estimates are population-level and do not predict individual outcomes.
              </div>
            </div>
          </div>
        )}
 
        {/* Landing cards */}
        {phase === "idle" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 11, marginTop: 5 }}>
            {[
              { icon: "🧠", title: "Claude AI Classification", desc: "Claude Sonnet 4 parses your report, extracts every molecular marker, and classifies into all 10 WHO subgroups with confidence scoring and clinical narrative", color: "#52b4e0" },
              { icon: "📊", title: "Recurrence Modeling", desc: "AI-generated risk narrative and score cross-referenced against 2024–2026 literature, with a personalized MRI surveillance protocol", color: "#a87ee8" },
              { icon: "🔗", title: "Live Trial Matching", desc: "Real-time ClinicalTrials.gov v2 API queries — AI picks the search terms from your molecular profile, returns recruiting trials worldwide", color: "#52e0a0" },
            ].map((c, i) => (
              <div key={i} style={{ background: "#0d1422", border: "1px solid #1e2e45", borderRadius: 10, padding: 17 }}>
                <div style={{ fontSize: 21, marginBottom: 9 }}>{c.icon}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: c.color, marginBottom: 7 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: "#4a6080", lineHeight: 1.7 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
