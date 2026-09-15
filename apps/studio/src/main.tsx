import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL ?? "http://localhost:8000";

type UIIR = {
  product?: { name?: string; purpose?: string; audience?: string[] };
  screens?: Array<{ id: string; name: string; route: string; layout: string; regions?: Array<{ id: string; type: string; layout: string; components?: Array<{ id: string; component: string; props?: Record<string, unknown> }> }> }>;
};

function App() {
  const [prompt, setPrompt] = useState("Build a modern inventory management product for small retailers.");
  const [uiir, setUiir] = useState<UIIR | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const componentCount = useMemo(
    () => uiir?.screens?.reduce((sum, screen) => sum + (screen.regions?.reduce((r, region) => r + (region.components?.length ?? 0), 0) ?? 0), 0) ?? 0,
    [uiir],
  );

  async function build() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${ORCHESTRATOR_URL}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Build failed");
      setUiir(data.uiir);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Build failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">A</span><span>Arqen</span><small>Studio</small></div>
        <div className="status"><span className="dot" /> Design Engine · 0.1</div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <p className="eyebrow">PROJECT</p>
          <h1>{uiir?.product?.name ?? "New product"}</h1>
          <nav>
            {["Overview", "Structure", "Flows", "Screens", "Components", "Data"].map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}</button>)}
          </nav>
          <div className="sidebar-note">Arqen starts with product understanding, then compiles a structured interface.</div>
        </aside>

        <section className="canvas">
          <div className="canvas-head">
            <div><p className="eyebrow">DESIGN CANVAS</p><h2>{uiir ? "Compiled product prototype" : "Describe what you want to build"}</h2></div>
            {uiir && <span className="count">{uiir.screens?.length ?? 0} screens · {componentCount} components</span>}
          </div>
          {!uiir ? (
            <div className="empty">
              <div className="empty-symbol">+</div>
              <h3>Turn an idea into product structure</h3>
              <p>Arqen will understand the request, choose a coherent interface structure, and return a UIIR the renderer can control.</p>
            </div>
          ) : (
            <div className="prototype">
              <div className="prototype-header"><strong>{uiir.product?.name ?? "Product"}</strong><span>Preview</span></div>
              <div className="screen-grid">
                {uiir.screens?.map((screen) => <article className="screen" key={screen.id}><div className="screen-top"><strong>{screen.name}</strong><span>{screen.route}</span></div>{screen.regions?.flatMap((region) => region.components ?? []).slice(0, 6).map((component) => <div className="component" key={component.id}><span>{component.component}</span><small>{String(component.props?.title ?? component.props?.label ?? "Interface element")}</small></div>)}</article>)}
              </div>
            </div>
          )}
        </section>

        <aside className="context">
          <p className="eyebrow">CONTEXT</p>
          <div className="context-card"><strong>Product</strong><span>{uiir?.product?.purpose ?? "Waiting for product intent"}</span></div>
          <div className="context-card"><strong>Audience</strong><span>{uiir?.product?.audience?.join(", ") ?? "Not defined yet"}</span></div>
          <div className="context-card"><strong>System</strong><span>Arqen Light · responsive</span></div>
        </aside>
      </section>

      <footer className="composer">
        <div className="composer-inner">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} placeholder="Ask Arqen to build a product..." />
          <button className="build" onClick={build} disabled={loading || prompt.trim().length < 3}>{loading ? "Compiling…" : "Build"}</button>
        </div>
        {error && <p className="error">{error}</p>}
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
