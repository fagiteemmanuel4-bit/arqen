import { createRoot } from "react-dom/client";
import "./styles.css";

type Page = "home" | "product" | "technology" | "developers" | "roadmap" | "about";

const pages: Record<Page, { eyebrow: string; title: string; body: string }> = {
  home: { eyebrow: "DESIGN INTELLIGENCE FOR SOFTWARE", title: "Your AI can write the code. ARQEN makes the product feel designed.", body: "ARQEN understands existing software, extracts its interface structure, evaluates the design system, and turns evidence into safe, reviewable improvements." },
  product: { eyebrow: "THE PRODUCT", title: "A design-intelligence layer for software that already exists.", body: "ARQEN sits after generation and inside the engineering loop. It analyzes the interface rather than replacing the coding system that produced it." },
  technology: { eyebrow: "THE TECHNOLOGY", title: "Code becomes structure before it becomes a recommendation.", body: "Project analysis feeds a framework-neutral representation. Deterministic rules, design-system evidence and model reasoning can operate on the same structured surface." },
  developers: { eyebrow: "FOR DEVELOPERS", title: "Review the interface like you review the code.", body: "Use the CLI in an existing repository, inspect findings with file evidence, preview transformations, and keep the final decision with the engineer." },
  roadmap: { eyebrow: "PUBLIC ROADMAP", title: "Build the intelligence layer before the automation layer.", body: "The sequence is deliberate: understanding, UIIR, audit, safe transformations, provider interoperability, agent interfaces, visual validation and eventually continuous improvement." },
  about: { eyebrow: "ABOUT ARQEN", title: "Infrastructure for the part of software generation that still needs taste, evidence and restraint.", body: "ARQEN is being built as model-agnostic developer infrastructure. The model is replaceable; the representations, analysis and validation are the product." },
};

function navigate(page: Page) { history.pushState({}, "", page === "home" ? "/" : `/${page}`); window.dispatchEvent(new PopStateEvent("popstate")); }
function currentPage(): Page { const value = location.pathname.split("/")[1] as Page; return pages[value] ? value : "home"; }

function App() {
  const [page, setPage] = React.useState<Page>(currentPage());
  React.useEffect(() => { const sync = () => setPage(currentPage()); addEventListener("popstate", sync); return () => removeEventListener("popstate", sync); }, []);
  const content = pages[page];
  return <div className="site">
    <header className="nav"><button className="wordmark" onClick={() => navigate("home")}>ARQEN</button><nav>{(["product", "technology", "developers", "roadmap", "about"] as Page[]).map((item) => <button key={item} onClick={() => navigate(item)} className={page === item ? "selected" : ""}>{item}</button>)}</nav><button className="access" onClick={() => navigate("developers")}>Developer access <span>→</span></button></header>
    <main>
      <section className="hero"><div className="hero-copy"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p className="lede">{content.body}</p><div className="actions"><button className="primary" onClick={() => navigate("developers")}>Explore the workflow <span>→</span></button><button className="secondary" onClick={() => navigate("technology")}>Read the technology</button></div></div><div className="signal"><div className="signal-top"><span>ARQEN / SYSTEM</span><span>0.2</span></div><div className="signal-line"><i></i><span>PROJECT</span><strong>→</strong><span>UIIR</span><strong>→</strong><span>AUDIT</span></div><div className="signal-grid"><div><b>01</b><span>Understand</span><small>framework · routes · components</small></div><div><b>02</b><span>Evaluate</span><small>hierarchy · spacing · accessibility</small></div><div><b>03</b><span>Transform</span><small>diff · risk · validation</small></div></div></div></section>
      <section className="thesis"><p className="eyebrow">THE GAP</p><div className="thesis-grid"><h2>Functional software is not the same thing as a finished product.</h2><div><p>Modern coding models can generate working interfaces at remarkable speed. The hard part is increasingly deciding whether those interfaces communicate clearly, scale coherently, and behave like one product.</p><p>ARQEN turns those decisions into inspectable engineering signals.</p></div></div></section>
      <section className="workflow"><div><p className="eyebrow">WORKFLOW</p><h2>Designed to enter the loop, not replace it.</h2></div><div className="steps">{[["01","Analyze","Map the project, framework, routes, components and design signals."],["02","Audit","Combine deterministic checks with structured design reasoning."],["03","Review","Return evidence, severity, affected files and a concrete recommendation."],["04","Transform","Generate bounded, reversible changes rather than rewriting the project."]].map(([n,t,d]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
      <section className="principles"><p className="eyebrow">ENGINEERING PRINCIPLES</p><div className="principle-grid">{["Model-agnostic by design","Evidence before opinions","Small transformations over rewrites","Responsive and accessible by default","Human approval for risky changes","Structured representations over raw prompts"].map((item, i) => <div key={item}><span>{String(i + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}</div></section>
    </main>
    <footer><span>ARQEN · DESIGN INTELLIGENCE FOR AI-GENERATED SOFTWARE</span><span>Built as developer infrastructure.</span></footer>
  </div>;
}

import * as React from "react";
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
