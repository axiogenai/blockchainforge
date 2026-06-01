'use client';

import React from 'react';
import Link from 'next/link';
import { Blocks, ArrowRight, Zap, Code, ShieldCheck, Database, FileCode2, GitBranch } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Cosmos SDK v0.50 Compatible</div>
          <h1 className="hero-title">
            Build Appchains <br />
            <span className="text-gradient">Powered by AI</span>
          </h1>
          <p className="hero-subtitle">
            Design, configure, and generate production-ready Cosmos SDK blockchains in minutes. 
            No more wrestling with boilerplate—just pure innovation.
          </p>
          <div className="hero-actions">
            <Link href="/build" className="btn btn-primary btn-large">
              Start Building <ArrowRight size={20} />
            </Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="btn btn-secondary btn-large">
              View on GitHub
            </a>
          </div>
        </div>
        
        {/* Decorative elements for hero background */}
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Enterprise-Grade Architecture</h2>
        <p className="section-subtitle">Everything you need to launch a high-performance network, generated instantly.</p>
        
        <div className="landing-features-grid">
          <div className="landing-feature">
            <div className="landing-feature-icon"><Zap size={28} /></div>
            <h3>Instant Scaffolding</h3>
            <p>Generate thousands of lines of Go code in milliseconds. We handle the boilerplate so you can focus on logic.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon"><Code size={28} /></div>
            <h3>Live Code Preview</h3>
            <p>Inspect your generated app.go, config.toml, and genesis.json in real-time with syntax-highlighted IDE previews.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon"><GitBranch size={28} /></div>
            <h3>Direct GitHub Export</h3>
            <p>Push your newly generated blockchain directly to a new GitHub repository with a single click.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon"><ShieldCheck size={28} /></div>
            <h3>Secure by Default</h3>
            <p>Leveraging the latest Cosmos SDK v0.50 security features, AuthZ, and standard best practices.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon"><Database size={28} /></div>
            <h3>Advanced Modules</h3>
            <p>One-click integration for IBC, CosmWasm Smart Contracts, Governance, and native NFT modules.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon"><FileCode2 size={28} /></div>
            <h3>Clean Templates</h3>
            <p>Beautiful, highly documented Go templates that experienced Cosmos developers will love maintaining.</p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="how-it-works-section">
        <h2 className="section-title">From Concept to Code in 3 Steps</h2>
        
        <div className="steps-wrapper">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3>Configure Network</h3>
            <p>Define your tokenomics, consensus mechanism, block time, and select the modules your chain requires.</p>
          </div>
          <div className="step-card">
            <div className="step-number">02</div>
            <h3>Preview & Review</h3>
            <p>Verify your configuration and inspect the generated Go source code live in your browser.</p>
          </div>
          <div className="step-card">
            <div className="step-number">03</div>
            <h3>Deploy & Launch</h3>
            <p>Download your complete project zip or push it directly to a new GitHub repository.</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bottom-cta">
        <div className="cta-box">
          <h2>Ready to forge your chain?</h2>
          <p>Join the next generation of application-specific blockchains.</p>
          <Link href="/build" className="btn btn-primary btn-large">
            Create Your Blockchain Now <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </main>
  );
}
