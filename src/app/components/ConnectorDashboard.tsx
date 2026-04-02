'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Grid, List, Zap, ExternalLink,
  ChevronRight, X, Key, Link2, Unlink, Activity,
  BarChart3, Clock, CheckCircle2, XCircle, Settings,
  Plus, RefreshCw, ArrowRight, Layers, Globe, Shield,
  Terminal, BookOpen
} from 'lucide-react';
import ConnectorIcon from '@/app/components/ConnectorIcon';

interface ConnectorAction {
  name: string;
  displayName: string;
  description: string;
  method: string;
  inputSchema: any;
}

interface Connector {
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  website: string;
  authType: 'oauth' | 'api_key' | 'none';
  actionsCount: number;
  actions: ConnectorAction[];
  webhookSupport: boolean;
  documentation?: string;
  version: string;
  status: string;
}

interface Connection {
  connectorSlug: string;
  authType: string;
  status: string;
  connectedAt: string;
  lastUsed?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  communication: { label: 'Communication', icon: '💬', color: '#3b82f6' },
  productivity: { label: 'Productivity', icon: '📋', color: '#8b5cf6' },
  finance: { label: 'Finance', icon: '💰', color: '#10b981' },
  devtools: { label: 'Developer Tools', icon: '🛠️', color: '#f59e0b' },
  data: { label: 'Data & Analytics', icon: '📊', color: '#06b6d4' },
  marketing: { label: 'Marketing', icon: '📣', color: '#ec4899' },
  crm: { label: 'CRM', icon: '🤝', color: '#f97316' },
  cloud: { label: 'Cloud', icon: '☁️', color: '#6366f1' },
  ai: { label: 'AI & ML', icon: '🤖', color: '#a855f7' },
  social: { label: 'Social Media', icon: '📱', color: '#14b8a6' },
  ecommerce: { label: 'E-Commerce', icon: '🛒', color: '#84cc16' },
  analytics: { label: 'Analytics', icon: '📈', color: '#0ea5e9' },
  storage: { label: 'Storage', icon: '💾', color: '#64748b' },
  security: { label: 'Security', icon: '🔒', color: '#ef4444' },
  hr: { label: 'HR & Recruiting', icon: '👥', color: '#d946ef' },
};

// Component is now imported from @/app/components/ConnectorIcon

export default function ConnectorDashboard({ initialSlug }: { initialSlug?: string }) {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'connectors' | 'logs'>('connectors');
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [actionPayload, setActionPayload] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showExecutionResult, setShowExecutionResult] = useState(false);

  // Load connectors
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/connectors');
        const data = await res.json();
        if (data.success) {
          setConnectors(data.data);
          
          if (initialSlug) {
            const initial = data.data.find((c: Connector) => c.slug === initialSlug);
            if (initial) setSelectedConnector(initial);
          }
        }
      } catch (err) {
        console.error('Failed to load connectors:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [initialSlug]);

  // Load connections
  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch('/api/connections?userId=demo-user');
        const data = await res.json();
        if (data.success) {
          setConnections(data.data);
        }
      } catch {
        // DB might not be available
      }
    }
    fetchConnections();
  }, []);

  const isConnected = useCallback((slug: string) => {
    return connections.some(c => c.connectorSlug === slug && c.status === 'active');
  }, [connections]);

  // Get unique categories from actual data
  const categories = useMemo(() => {
    const cats = new Set(connectors.map(c => c.category));
    return Array.from(cats).sort();
  }, [connectors]);

  // Filter connectors
  const filteredConnectors = useMemo(() => {
    let result = connectors;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      result = result.filter(c => c.category === selectedCategory);
    }

    return result;
  }, [connectors, searchQuery, selectedCategory]);

  // Stats
  const stats = useMemo(() => ({
    total: connectors.length,
    connected: connections.filter(c => c.status === 'active').length,
    categories: categories.length,
  }), [connectors, connections, categories]);

  // Handle connect
  const handleConnect = async (connector: Connector) => {
    setConnectingSlug(connector.slug);

    if (connector.authType === 'oauth') {
      try {
        const res = await fetch(`/api/auth/${connector.slug}?userId=demo-user`);
        const data = await res.json();
        if (data.success && data.authUrl) {
          window.open(data.authUrl, '_blank');
        }
      } catch (err) {
        console.error('OAuth error:', err);
      }
    } else if (connector.authType === 'api_key') {
      setShowApiKeyModal(true);
    } else {
      // No auth required
      try {
        await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'demo-user',
            connectorSlug: connector.slug,
          }),
        });
        setConnections(prev => [...prev, {
          connectorSlug: connector.slug,
          authType: 'none',
          status: 'active',
          connectedAt: new Date().toISOString(),
        }]);
      } catch (err) {
        console.error('Connect error:', err);
      }
    }

    setConnectingSlug(null);
  };

  // Handle API key submit
  const handleApiKeySubmit = async () => {
    if (!selectedConnector || !apiKeyInput.trim()) return;

    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          connectorSlug: selectedConnector.slug,
          apiKey: apiKeyInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnections(prev => [...prev, {
          connectorSlug: selectedConnector.slug,
          authType: 'api_key',
          status: 'active',
          connectedAt: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error('API key connect error:', err);
    }

    setApiKeyInput('');
    setShowApiKeyModal(false);
  };

  // Handle disconnect
  const handleDisconnect = async (slug: string) => {
    try {
      await fetch(`/api/connections?userId=demo-user&connectorSlug=${slug}`, {
        method: 'DELETE',
      });
      setConnections(prev => prev.filter(c => c.connectorSlug !== slug));
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 40, height: 40,
              background: 'var(--accent-gradient)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
            }}>
              <Zap size={22} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Kratyx Connect
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Universal MCP Connector Platform
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className={activeTab === 'connectors' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setActiveTab('connectors')}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <Layers size={16} /> Connectors
            </button>
            <button
              className={activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setActiveTab('logs')}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <Activity size={16} /> Logs
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px' }}>
        {activeTab === 'connectors' ? (
          <ConnectorsView
            connectors={filteredConnectors}
            connections={connections}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={categories}
            viewMode={viewMode}
            setViewMode={setViewMode}
            stats={stats}
            isConnected={isConnected}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            selectedConnector={selectedConnector}
            setSelectedConnector={setSelectedConnector}
            connectingSlug={connectingSlug}
            onApiKeyConnect={(connector) => {
              setSelectedConnector(connector);
              setShowApiKeyModal(true);
            }}
          />
        ) : (
          <LogsView />
        )}
      </main>

      {/* API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && selectedConnector && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowApiKeyModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ConnectorIcon name={selectedConnector.name} slug={selectedConnector.slug} color={selectedConnector.color} size={40} />
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>Connect {selectedConnector.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Enter your API key</p>
                  </div>
                </div>
                <button onClick={() => setShowApiKeyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <Key size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  API Key
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="sk-..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleApiKeySubmit()}
                />
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                <Shield size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Your API key is encrypted with AES-256 before storage
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowApiKeyModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleApiKeySubmit} disabled={!apiKeyInput.trim()}>
                  <Link2 size={16} /> Connect
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connector Detail Modal */}
      <AnimatePresence>
        {selectedConnector && !showApiKeyModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedConnector(null)}
          >
            <motion.div
              className="modal-content"
              style={{ maxWidth: 600 }}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ConnectorIcon name={selectedConnector.name} slug={selectedConnector.slug} color={selectedConnector.color} size={56} />
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>{selectedConnector.name}</h2>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span className="category-tag" style={{ fontSize: 11 }}>
                        {CATEGORY_CONFIG[selectedConnector.category]?.icon} {CATEGORY_CONFIG[selectedConnector.category]?.label || selectedConnector.category}
                      </span>
                      <span className={`badge ${selectedConnector.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {selectedConnector.status}
                      </span>
                      {isConnected(selectedConnector.slug) && (
                        <span className="badge badge-success">
                          <span className="status-dot active" /> Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedConnector(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginTop: 4 }}>
                  <X size={20} />
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                {selectedConnector.description}
              </p>

              {/* Meta Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ padding: 12, background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Auth Type</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {selectedConnector.authType === 'oauth' ? '🔐 OAuth 2.0' : selectedConnector.authType === 'api_key' ? '🔑 API Key' : '🌐 No Auth'}
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Actions</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedConnector.actionsCount} available</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
                  <Terminal size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Available Actions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedConnector.actions.map(action => (
                    <div key={action.name} className="glass-card" style={{
                      padding: '16px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{action.displayName}</span>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{action.description}</p>
                        </div>
                        <span className={`badge ${action.method === 'GET' ? 'badge-success' : action.method === 'POST' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                          {action.method}
                        </span>
                      </div>

                      {/* Dynamic Parameters Form */}
                      {action.inputSchema?.properties && Object.keys(action.inputSchema.properties).length > 0 && (
                        <div style={{ 
                          padding: 12, 
                          background: 'rgba(0,0,0,0.2)', 
                          borderRadius: 'var(--radius-sm)', 
                          marginBottom: 12,
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: 8
                        }}>
                          {Object.entries(action.inputSchema.properties).map(([key, prop]: [string, any]) => (
                            <div key={key}>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                                {key} {prop.type ? `(${prop.type})` : ''}
                              </label>
                              <input 
                                type="text"
                                className="input"
                                placeholder={`Enter ${key}...`}
                                style={{ padding: '6px 12px', fontSize: 13 }}
                                value={actionPayload[`${action.name}_${key}`] || ''}
                                onChange={(e) => setActionPayload(prev => ({
                                  ...prev,
                                  [`${action.name}_${key}`]: e.target.value
                                }))}
                                disabled={!isConnected(selectedConnector.slug)}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '6px 16px', fontSize: 12 }}
                          disabled={!isConnected(selectedConnector.slug) || executingAction === action.name}
                          onClick={async () => {
                            setExecutingAction(action.name);
                            setExecutionResult(null);
                            
                            // Build payload
                            const payload: Record<string, any> = {};
                            const prefix = `${action.name}_`;
                            Object.entries(actionPayload).forEach(([k, v]) => {
                              if (k.startsWith(prefix)) {
                                payload[k.substring(prefix.length)] = v;
                              }
                            });

                            try {
                              const res = await fetch('/api/execute', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  userId: 'demo-user',
                                  connectorSlug: selectedConnector.slug,
                                  actionName: action.name,
                                  payload
                                })
                              });
                              const data = await res.json();
                              setExecutionResult(data);
                              setShowExecutionResult(true);
                              
                              // If switched to logs tab, it would be better
                            } catch (err) {
                              setExecutionResult({ success: false, error: 'Network error or execution failed' });
                              setShowExecutionResult(true);
                            } finally {
                              setExecutingAction(null);
                            }
                          }}
                        >
                          {executingAction === action.name ? (
                            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <ArrowRight size={14} />
                          )}
                          Execute
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                {selectedConnector.website && (
                  <a href={selectedConnector.website} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    <Globe size={16} /> Website
                  </a>
                )}
                {selectedConnector.documentation && (
                  <a href={selectedConnector.documentation} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    <BookOpen size={16} /> Docs
                  </a>
                )}
                {isConnected(selectedConnector.slug) ? (
                  <button className="btn-danger" onClick={() => { handleDisconnect(selectedConnector.slug); setSelectedConnector(null); }}>
                    <Unlink size={16} /> Disconnect
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => {
                    if (selectedConnector.authType === 'api_key') {
                      setShowApiKeyModal(true);
                    } else {
                      handleConnect(selectedConnector);
                    }
                  }}>
                    <Link2 size={16} /> Connect
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution Result Modal */}
      <AnimatePresence>
        {showExecutionResult && executionResult && (
          <motion.div
            className="modal-overlay"
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExecutionResult(false)}
          >
            <motion.div
              className="modal-content"
              style={{ maxWidth: 700, border: `1px solid ${executionResult.success ? 'var(--success)' : 'var(--danger)'}44` }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    width: 32, height: 32, borderRadius: '50%', 
                    background: executionResult.success ? 'var(--success)22' : 'var(--danger)22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: executionResult.success ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {executionResult.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                    Execution {executionResult.success ? 'Successful' : 'Failed'}
                  </h3>
                </div>
                <button onClick={() => setShowExecutionResult(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Status Code</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{executionResult.statusCode}</div>
                </div>
                <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Duration</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{executionResult.duration}ms</div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Response Data</h4>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: 11 }}
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(executionResult.data, null, 2))}
                  >
                    Copy JSON
                  </button>
                </div>
                <pre style={{ 
                  padding: 16, 
                  background: '#050505', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: 12, 
                  color: '#a5f3fc',
                  overflowX: 'auto',
                  maxHeight: 300,
                  border: '1px solid var(--border-subtle)'
                }}>
                  {JSON.stringify(executionResult.data || { error: executionResult.error }, null, 2)}
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button className="btn-secondary" onClick={() => setShowExecutionResult(false)}>Close</button>
                <button className="btn-primary" onClick={() => {
                  setShowExecutionResult(false);
                  setSelectedConnector(null);
                  setActiveTab('logs');
                }}>
                  View in Logs
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Connectors View
// ============================================
function ConnectorsView({
  connectors, connections, loading, searchQuery, setSearchQuery,
  selectedCategory, setSelectedCategory, categories, viewMode, setViewMode,
  stats, isConnected, onConnect, onDisconnect, setSelectedConnector,
  connectingSlug, onApiKeyConnect,
}: {
  connectors: Connector[];
  connections: Connection[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  categories: string[];
  viewMode: 'grid' | 'list';
  setViewMode: (m: 'grid' | 'list') => void;
  stats: { total: number; connected: number; categories: number };
  isConnected: (slug: string) => boolean;
  onConnect: (c: Connector) => void;
  onDisconnect: (slug: string) => void;
  selectedConnector: Connector | null;
  setSelectedConnector: (c: Connector | null) => void;
  connectingSlug: string | null;
  onApiKeyConnect: (c: Connector) => void;
}) {
  return (
    <>
      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Connectors', value: stats.total, icon: <Layers size={20} />, color: '#6366f1' },
          { label: 'Connected', value: stats.connected, icon: <CheckCircle2 size={20} />, color: '#10b981' },
          { label: 'Categories', value: stats.categories, icon: <BarChart3 size={20} />, color: '#8b5cf6' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card"
            style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: `${stat.color}15`, color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search connectors by name, category, or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 42 }}
              id="connector-search"
            />
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              id="view-grid"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              id="view-list"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`category-tag ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-tag ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              {CATEGORY_CONFIG[cat]?.icon || '📦'} {CATEGORY_CONFIG[cat]?.label || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Showing {connectors.length} connector{connectors.length !== 1 ? 's' : ''}
          {searchQuery && ` for "${searchQuery}"`}
          {selectedCategory && ` in ${CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory}`}
        </p>
      </div>

      {/* Connector Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr',
          gap: 16,
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: viewMode === 'grid' ? 180 : 80, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : connectors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <Search size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No connectors found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {connectors.map((connector, index) => (
            <ConnectorCard
              key={connector.slug}
              connector={connector}
              index={index}
              connected={isConnected(connector.slug)}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onSelect={setSelectedConnector}
              onApiKeyConnect={onApiKeyConnect}
              isConnecting={connectingSlug === connector.slug}
            />
          ))}
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {connectors.map((connector, index) => (
            <ConnectorListItem
              key={connector.slug}
              connector={connector}
              index={index}
              connected={isConnected(connector.slug)}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onSelect={setSelectedConnector}
              onApiKeyConnect={onApiKeyConnect}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ============================================
// Connector Card (Grid View)
// ============================================
function ConnectorCard({
  connector, index, connected, onConnect, onDisconnect, onSelect, onApiKeyConnect, isConnecting
}: {
  connector: Connector;
  index: number;
  connected: boolean;
  onConnect: (c: Connector) => void;
  onDisconnect: (slug: string) => void;
  onSelect: (c: Connector) => void;
  onApiKeyConnect: (c: Connector) => void;
  isConnecting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      className="glass-card"
      style={{ padding: 24, cursor: 'pointer', position: 'relative' }}
      onClick={() => onSelect(connector)}
      id={`connector-${connector.slug}`}
    >
      {/* Connected indicator */}
      {connected && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span className="status-dot active" />
          <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>Connected</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <ConnectorIcon name={connector.name} slug={connector.slug} color={connector.color} size={48} />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{connector.name}</h3>
          <span className="category-tag" style={{ fontSize: 10, padding: '2px 8px' }}>
            {CATEGORY_CONFIG[connector.category]?.icon} {CATEGORY_CONFIG[connector.category]?.label || connector.category}
          </span>
        </div>
      </div>

      <p style={{
        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
        marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {connector.description}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {connector.authType === 'oauth' ? '🔐' : connector.authType === 'api_key' ? '🔑' : '🌐'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {connector.actionsCount} actions
          </span>
        </div>

        <button
          className={connected ? 'btn-danger' : 'btn-primary'}
          style={{ padding: '6px 14px', fontSize: 12 }}
          onClick={e => {
            e.stopPropagation();
            if (connected) {
              onDisconnect(connector.slug);
            } else if (connector.authType === 'api_key') {
              onApiKeyConnect(connector);
            } else {
              onConnect(connector);
            }
          }}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Connecting...</>
          ) : connected ? (
            <><Unlink size={14} /> Disconnect</>
          ) : (
            <><Link2 size={14} /> Connect</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ============================================
// Connector List Item
// ============================================
function ConnectorListItem({
  connector, index, connected, onConnect, onDisconnect, onSelect, onApiKeyConnect
}: {
  connector: Connector;
  index: number;
  connected: boolean;
  onConnect: (c: Connector) => void;
  onDisconnect: (slug: string) => void;
  onSelect: (c: Connector) => void;
  onApiKeyConnect: (c: Connector) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="glass-card"
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: 'pointer',
      }}
      onClick={() => onSelect(connector)}
    >
      <ConnectorIcon name={connector.name} slug={connector.slug} color={connector.color} size={40} />

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{connector.name}</span>
          {connected && <span className="status-dot active" />}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {connector.description}
        </p>
      </div>

      <span className="category-tag" style={{ fontSize: 11 }}>
        {CATEGORY_CONFIG[connector.category]?.icon} {CATEGORY_CONFIG[connector.category]?.label || connector.category}
      </span>

      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 80, textAlign: 'center' }}>
        {connector.actionsCount} actions
      </span>

      <button
        className={connected ? 'btn-danger' : 'btn-primary'}
        style={{ padding: '6px 14px', fontSize: 12, minWidth: 110 }}
        onClick={e => {
          e.stopPropagation();
          if (connected) onDisconnect(connector.slug);
          else if (connector.authType === 'api_key') onApiKeyConnect(connector);
          else onConnect(connector);
        }}
      >
        {connected ? <><Unlink size={14} /> Disconnect</> : <><Link2 size={14} /> Connect</>}
      </button>

      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
    </motion.div>
  );
}

// ============================================
// Logs View
// ============================================
function LogsView() {
  const [logs, setLogs] = useState<Array<{
    connectorSlug: string;
    actionName: string;
    method: string;
    statusCode: number;
    duration: number;
    success: boolean;
    error?: string;
    timestamp: string;
  }>>([]);
  const [logStats, setLogStats] = useState({ totalExecutions: 0, successCount: 0, failureCount: 0, avgDuration: 0 });
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs?userId=all&limit=100');
        const data = await res.json();
        if (data.success) {
          setLogs(data.data);
          setLogStats(data.stats);
        }
      } catch {
        // API might not be accessible
      } finally {
        setLoadingLogs(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
          <Activity size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
          Execution Logs
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Monitor all connector API calls and their performance
        </p>
      </motion.div>

      {/* Log Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Executions', value: logStats.totalExecutions, icon: <Activity size={18} />, color: '#6366f1' },
          { label: 'Successful', value: logStats.successCount, icon: <CheckCircle2 size={18} />, color: '#10b981' },
          { label: 'Failed', value: logStats.failureCount, icon: <XCircle size={18} />, color: '#ef4444' },
          { label: 'Avg Duration', value: `${Math.round(logStats.avgDuration || 0)}ms`, icon: <Clock size={18} />, color: '#f59e0b' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card"
            style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: `${stat.color}15`, color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Log Table */}
      {loadingLogs ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Activity size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No logs yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Execution logs will appear here when you run connector actions</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Status', 'Connector', 'Action', 'Method', 'Duration', 'Time'].map(h => (
                  <th key={h} style={{
                    padding: '14px 16px', textAlign: 'left', fontSize: 12,
                    fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    {log.success ? (
                      <CheckCircle2 size={18} color="var(--success)" />
                    ) : (
                      <XCircle size={18} color="var(--danger)" />
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>{log.connectorSlug}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{log.actionName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${log.method === 'GET' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 10 }}>
                      {log.method}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{log.duration}ms</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
