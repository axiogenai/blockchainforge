'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, GitBranch, Code, CheckCircle, 
  ArrowRight, ArrowLeft, Scroll, Landmark, 
  Link as LinkIcon, Diamond, Image as ImageIcon, 
  ShieldCheck, BookOpen, Blocks
} from 'lucide-react';

import Prism from 'prismjs';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-toml';
import 'prismjs/themes/prism-tomorrow.css';

const STEPS = [
  { label: 'Basics', description: 'Name your network and define its identity.' },
  { label: 'Economics', description: 'Configure consensus, supply, and block timing.' },
  { label: 'Features', description: 'Enable modules and capabilities.' },
  { label: 'Validators', description: 'Set up your validator network parameters.' },
  { label: 'Review & Code', description: 'Review, preview, and deploy.' },
];

const FEATURES = [
  { id: 'smartContracts', icon: <Scroll size={24} />, name: 'Smart Contracts', desc: 'CosmWasm VM for on-chain programs' },
  { id: 'governance', icon: <Landmark size={24} />, name: 'Governance', desc: 'On-chain proposals and voting' },
  { id: 'ibc', icon: <LinkIcon size={24} />, name: 'IBC Transfer', desc: 'Cross-chain interoperability' },
  { id: 'staking', icon: <Diamond size={24} />, name: 'Staking Rewards', desc: 'Delegated staking with rewards' },
  { id: 'nft', icon: <ImageIcon size={24} />, name: 'NFT Module', desc: 'Mint and transfer NFTs natively' },
  { id: 'authz', icon: <ShieldCheck size={24} />, name: 'AuthZ', desc: 'Grant permissions to other accounts' },
];

export default function Home() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Preview state
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('app.go');

  // GitHub state
  const [githubToken, setGithubToken] = useState('');
  const [pushing, setPushing] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    consensus: 'Proof of Stake',
    supply: '1000000000',
    blockTime: '2',
    inflationRate: '7',
    features: ['staking'] as string[],
    minStake: '1000',
    maxValidators: '100',
    unbondingDays: '21',
    customInstructions: '',
  });

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (featureId: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const canProceed = (): boolean => {
    if (step === 1) return formData.name.trim().length > 0 && formData.symbol.trim().length > 0;
    if (step === 2) return formData.supply.trim().length > 0 && formData.blockTime.trim().length > 0;
    return true;
  };

  const nextStep = () => {
    if (!canProceed()) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');
    setStep(s => Math.min(s + 1, 5));
  };

  const prevStep = () => {
    setError('');
    setStep(s => Math.max(s - 1, 1));
  };

  // Run PrismJS syntax highlighting
  useEffect(() => {
    if (previewData && step === 5) {
      Prism.highlightAll();
    }
  }, [previewData, activeTab, step]);

  // Load preview when reaching step 5
  useEffect(() => {
    if (step === 5) {
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setPreviewData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Generation failed. Please try again.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.name.toLowerCase().replace(/\s+/g, '-')}-blockchain.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubPush = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!githubToken) {
      setError('Please enter a GitHub Personal Access Token to push directly.');
      return;
    }
    setPushing(true);
    setError('');
    
    try {
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken, formData }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to push to GitHub');
      
      setGithubUrl(data.url);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setPushing(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSuccess(false);
    setError('');
    setGithubUrl('');
    setPreviewData(null);
  };

  const progressPercent = ((step - 1) / (STEPS.length - 1)) * 100;

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.go')) return 'go';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.toml')) return 'toml';
    return 'none';
  };

  return (
    <>
      <main className={`container ${step === 5 ? 'container-wide' : ''}`}>
        {/* Header */}
        <header className="header">
          <h1 className="logo-text">Build Your Blockchain</h1>
          <p className="tagline">
            Design, configure, and generate production-ready Cosmos SDK v0.50 networks — powered by AI.
          </p>
        </header>

        <div className="glass-panel">
          {!success ? (
            <>
              {/* Progress Bar */}
              <div className="progress-bar">
                {STEPS.map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="progress-spacer" />}
                    <div className={`progress-dot ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}>
                      {step > i + 1 ? '✓' : i + 1}
                      <span className={`progress-label ${step === i + 1 ? 'active' : ''}`}>{s.label}</span>
                    </div>
                  </React.Fragment>
                ))}
                {/* Track and Fill */}
                <div className="progress-track" />
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>

              <form onSubmit={step === 5 ? handleDownload : (e) => { e.preventDefault(); nextStep(); }}>
                {/* ─── STEP 1-4: Existing Layout ─── */}
                {step === 1 && (
                  <div className="step-content">
                    <div className="step-header">
                      <h2 className="step-title">Network Basics</h2>
                      <p className="step-description">{STEPS[0].description}</p>
                    </div>
                    <div className="form-group">
                      <label>Blockchain Name *</label>
                      <input type="text" placeholder="e.g. Axiogen Chain" value={formData.name} onChange={e => updateForm('name', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Token Symbol *</label>
                      <input type="text" placeholder="e.g. AXG" value={formData.symbol} onChange={e => updateForm('symbol', e.target.value.toUpperCase())} maxLength={6} />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea placeholder="A brief description of your blockchain's purpose..." value={formData.description} onChange={e => updateForm('description', e.target.value)} />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="step-content">
                    <div className="step-header">
                      <h2 className="step-title">Consensus & Economics</h2>
                      <p className="step-description">{STEPS[1].description}</p>
                    </div>
                    <div className="form-group">
                      <label>Consensus Mechanism</label>
                      <select value={formData.consensus} onChange={e => updateForm('consensus', e.target.value)}>
                        <option value="Proof of Stake">Proof of Stake (Tendermint BFT)</option>
                        <option value="Delegated Proof of Stake">Delegated Proof of Stake</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Total Supply</label>
                      <input type="text" placeholder="e.g. 1000000000" value={formData.supply} onChange={e => updateForm('supply', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Block Time (seconds)</label>
                      <input type="text" placeholder="e.g. 2" value={formData.blockTime} onChange={e => updateForm('blockTime', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Inflation Rate (%)</label>
                      <input type="text" placeholder="e.g. 7" value={formData.inflationRate} onChange={e => updateForm('inflationRate', e.target.value)} />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="step-content">
                    <div className="step-header">
                      <h2 className="step-title">Features & Modules</h2>
                      <p className="step-description">{STEPS[2].description}</p>
                    </div>
                    <div className="features-grid">
                      {FEATURES.map(feature => (
                        <div
                          key={feature.id}
                          className={`feature-card ${formData.features.includes(feature.id) ? 'active' : ''}`}
                          onClick={() => toggleFeature(feature.id)}
                        >
                          <div className="feature-check">{formData.features.includes(feature.id) ? '✓' : ''}</div>
                          <div className="feature-icon-wrapper">{feature.icon}</div>
                          <div className="feature-name">{feature.name}</div>
                          <div className="feature-desc">{feature.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="step-content">
                    <div className="step-header">
                      <h2 className="step-title">Validator Network</h2>
                      <p className="step-description">{STEPS[3].description}</p>
                    </div>
                    <div className="form-group">
                      <label>Maximum Validators</label>
                      <input type="text" placeholder="e.g. 100" value={formData.maxValidators} onChange={e => updateForm('maxValidators', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Minimum Stake ({formData.symbol || 'tokens'})</label>
                      <input type="text" placeholder="e.g. 1000" value={formData.minStake} onChange={e => updateForm('minStake', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Unbonding Period (days)</label>
                      <input type="text" placeholder="e.g. 21" value={formData.unbondingDays} onChange={e => updateForm('unbondingDays', e.target.value)} />
                    </div>
                  </div>
                )}

                {/* ─── STEP 5: Split Pane Review & Preview ─── */}
                {step === 5 && (
                  <div className="step-content split-pane">
                    {/* Left Pane: Review */}
                    <div className="pane-left">
                      <div className="step-header">
                        <h2 className="step-title">Review & Deploy</h2>
                        <p className="step-description">Verify your config and export.</p>
                      </div>

                      <div className="review-section">
                        <div className="review-section-title">Network Identity</div>
                        <div className="summary-box">
                          <div className="summary-item">
                            <span className="summary-label">Name</span>
                            <span className="summary-value">{formData.name}</span>
                          </div>
                          <div className="summary-item">
                            <span className="summary-label">Symbol</span>
                            <span className="summary-value">{formData.symbol}</span>
                          </div>
                        </div>
                      </div>

                      <div className="review-section">
                        <div className="review-section-title">Modules</div>
                        <div className="summary-box">
                          {FEATURES.filter(f => formData.features.includes(f.id)).map(f => (
                            <div className="summary-item" key={f.id}>
                              <span className="summary-label icon-label">{f.icon} {f.name}</span>
                              <span className="summary-value enabled">Enabled</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="divider" />
                      
                      <div className="export-actions">
                        <h3 className="export-title">Export Options</h3>
                        
                        <div className="form-group">
                          <label>GitHub Personal Access Token (Optional)</label>
                          <input 
                            type="password" 
                            placeholder="ghp_xxxxxxxxxxxx" 
                            value={githubToken} 
                            onChange={e => setGithubToken(e.target.value)} 
                          />
                          <p className="input-hint">Requires 'repo' scope to create and push to a new repository.</p>
                        </div>
                        
                        <div className="action-buttons">
                          <button type="submit" className="btn btn-secondary" disabled={loading || pushing}>
                            {loading ? <><div className="loading-spinner" /> Zipping...</> : <><Download size={18} /> Download .zip</>}
                          </button>
                          <button type="button" className="btn btn-primary" onClick={handleGithubPush} disabled={loading || pushing || !githubToken}>
                            {pushing ? <><div className="loading-spinner" /> Pushing...</> : <><GitBranch size={18} /> Push to GitHub</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Pane: Live Code Preview */}
                    <div className="pane-right">
                      <div className="preview-header">
                        <div className="preview-title">
                          <Code size={18} /> Live Code Preview
                        </div>
                        <div className="preview-tabs">
                          {['app.go', 'main.go', 'genesis.json', 'config.toml'].map(tab => (
                            <button
                              key={tab}
                              type="button"
                              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                              onClick={() => setActiveTab(tab)}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="preview-body">
                        {previewLoading ? (
                          <div className="preview-loading">
                            <div className="loading-spinner large" />
                            <p>Generating source code...</p>
                          </div>
                        ) : previewData ? (
                          <pre className="code-block">
                            <code className={`language-${getLanguage(activeTab)}`}>{previewData[activeTab]}</code>
                          </pre>
                        ) : (
                          <div className="preview-loading">Failed to load preview</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {error && <p className="error-message">{error}</p>}

                {/* Navigation Buttons */}
                <div className="button-group">
                  {step > 1 && (
                    <button type="button" className="btn btn-secondary" onClick={prevStep} disabled={loading || pushing}>
                      <ArrowLeft size={18} /> Back
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  {step < 5 && (
                    <button type="button" className="btn btn-primary" onClick={nextStep} disabled={!canProceed()}>
                      Continue <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              </form>
            </>
          ) : (
            /* ─── SUCCESS STATE ─── */
            <div className="success-container">
              <div className="success-icon"><CheckCircle size={48} /></div>
              <h2 className="success-title">Blockchain Generated!</h2>
              {githubUrl ? (
                <div className="success-github">
                  <p className="success-message">Your repository has been created successfully.</p>
                  <a href={githubUrl} target="_blank" rel="noreferrer" className="btn btn-primary github-link">
                    <GitBranch size={20} /> View on GitHub
                  </a>
                </div>
              ) : (
                <p className="success-message">
                  Your <strong className="text-gradient">{formData.name}</strong> project has been downloaded.<br />
                  Extract the .zip and follow the README to get started.
                </p>
              )}
              <div style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleReset}>
                  Create Another Network
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
