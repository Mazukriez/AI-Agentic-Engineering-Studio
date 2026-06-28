import React, { useState, useEffect } from 'react';
import { 
  Brain, Plus, Database, Sparkles, Activity, Award, Wrench, Trash2, 
  Loader2, Layers, HelpCircle, ArrowRight, ShieldAlert, Cpu 
} from 'lucide-react';
import { Agent } from './types';
import AgentForm from './components/AgentForm';
import DatasetManager from './components/DatasetManager';
import FineTuningPanel from './components/FineTuningPanel';
import SandboxChat from './components/SandboxChat';
import EvaluationDashboard from './components/EvaluationDashboard';

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'dataset' | 'tuning' | 'sandbox' | 'eval'>('profile');
  
  // Modals / Loading state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [updatingAgent, setUpdatingAgent] = useState(false);
  const [error, setError] = useState('');

  // Active instructions editor state
  const [editedInstructions, setEditedInstructions] = useState('');

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async (selectId?: string) => {
    setLoadingAgents(true);
    setError('');
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to retrieve agents from backend.');
      const data = await response.json();
      setAgents(data);
      
      // Auto select first or keep selected
      if (data.length > 0) {
        const target = selectId ? data.find((a: Agent) => a.id === selectId) : data[0];
        const toSelect = target || data[0];
        setSelectedAgent(toSelect);
        setEditedInstructions(toSelect.systemInstructions);
      } else {
        setSelectedAgent(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading platform.');
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleAgentSelected = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditedInstructions(agent.systemInstructions);
    // Don't reset tab, stay on current tab
  };

  const handleAgentCreated = (newAgent: Agent) => {
    setShowCreateModal(false);
    setAgents(prev => [...prev, newAgent]);
    setSelectedAgent(newAgent);
    setEditedInstructions(newAgent.systemInstructions);
    setActiveTab('profile');
  };

  const handleAgentUpdated = (updatedAgent: Agent) => {
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
    setSelectedAgent(updatedAgent);
    setEditedInstructions(updatedAgent.systemInstructions);
  };

  const handleSaveInstructions = async () => {
    if (!selectedAgent) return;
    setUpdatingAgent(true);
    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstructions: editedInstructions,
          status: 'untrained' // mark back to untrained since system prompt changed
        })
      });

      if (!response.ok) throw new Error('Failed to update instructions.');
      const data = await response.json();
      handleAgentUpdated(data);
      alert('System instructions updated! The agent status is reset to "untrained" to reflect prompt modifications.');
    } catch (err: any) {
      alert(err.message || 'Error updating agent instructions.');
    } finally {
      setUpdatingAgent(false);
    }
  };

  const handleDeleteAgent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you absolutely sure you want to delete this AI Agent? This deletes its entire training dataset.')) return;

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete agent.');
      
      // Reset
      const remaining = agents.filter(a => a.id !== id);
      setAgents(remaining);
      if (selectedAgent?.id === id) {
        if (remaining.length > 0) {
          setSelectedAgent(remaining[0]);
          setEditedInstructions(remaining[0].systemInstructions);
        } else {
          setSelectedAgent(null);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting agent.');
    }
  };

  // Stats aggregate
  const totalExamples = agents.reduce((sum, a) => sum + a.dataset.length, 0);
  const trainedCount = agents.filter(a => a.status === 'trained').length;
  const trainedPercent = agents.length > 0 ? Math.round((trainedCount / agents.length) * 100) : 0;

  return (
    <div id="platform-workspace" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. Global Navigation / Header */}
      <header id="global-header" className="bg-white border-b border-slate-200 flex items-center justify-between px-6 py-3.5 shrink-0 sticky top-0 z-30">
        <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Geometric brand diamond mark from Sleek Theme enclosing custom brain icon */}
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
              <div className="w-6 h-6 border-2 border-white rounded-sm rotate-45 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-white -rotate-45" />
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-slate-800">
                Agentic Studio <span className="text-blue-600 font-extrabold text-xs bg-blue-50/70 border border-blue-100 px-1.5 py-0.5 rounded">v2.4</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Enterprise AI Alignment & Meta-Tuning</span>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span>Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-700">{selectedAgent ? selectedAgent.name : 'No active agent'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6 self-end md:self-auto">
            {/* GPU cluster status badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              GPU: H100 Active
            </div>
            
            {/* User cluster indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
              <span className="font-mono text-[10px] text-slate-400">Node: us-east-1</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Platform Core Workspace Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        
        {/* Left column: Sidebar Explorer */}
        <div className="lg:col-span-1 space-y-4 flex flex-col">
          
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-2xs flex flex-col flex-1 min-h-[300px]">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4.5 h-4.5 text-slate-500" />
                Agent Profiles
              </h3>
              <button
                id="open-create-modal-btn"
                onClick={() => setShowCreateModal(true)}
                className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                title="Create custom agent"
              >
                <Plus className="w-4.5 h-4.5 text-blue-600" />
              </button>
            </div>

            {error && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 text-[11px] rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* Profiles lists */}
            {loadingAgents ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : agents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <Brain className="w-10 h-10 text-slate-300 mb-2" />
                <span className="text-xs font-semibold text-slate-600">No Agents Registered</span>
                <p className="text-[10px] text-slate-400 mt-1 mb-4">
                  Register your first target service agent profile.
                </p>
                <button
                  id="empty-sidebar-create-btn"
                  onClick={() => setShowCreateModal(true)}
                  className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create Agent
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {agents.map((item) => {
                  const isSelected = selectedAgent?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      id={`agent-sidebar-row-${item.id}`}
                      onClick={() => handleAgentSelected(item)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative group ${
                        isSelected
                          ? 'bg-blue-50/45 border-blue-200 shadow-2xs'
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.serviceTask}
                          </span>
                        </div>
                        <button
                          id={`delete-agent-btn-${item.id}`}
                          onClick={(e) => handleDeleteAgent(item.id, e)}
                          className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Agent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          item.status === 'trained'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-medium">
                          {item.dataset.length} samples
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resource Usage & Info Monitor from Sleek Theme */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Resource Usage
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Visualizing active cluster capacity for distributed fine-tuning.
              </p>
            </div>
            
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">Storage Clusters</span>
                  <span className="font-mono text-slate-400">750GB / 1TB</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-3/4 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">Tensor Memory</span>
                  <span className="font-mono text-slate-400">54.2GB / 80GB</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 w-[67%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column 3/4: Workspace Tabs & Panel Display */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          
          {selectedAgent ? (
            <>
              {/* Profile Overview Card Header */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">{selectedAgent.name}</h2>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        selectedAgent.status === 'trained'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {selectedAgent.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedAgent.description || 'No description provided.'}</p>
                  </div>
                  <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100/80 flex items-center gap-2 text-xs">
                    <Cpu className="w-4.5 h-4.5 text-slate-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block leading-none mb-0.5">Base LLM</span>
                      <span className="font-mono text-slate-700 font-bold leading-none">{selectedAgent.baseModel}</span>
                    </div>
                  </div>
                </div>

                {/* Tab selector */}
                <div className="flex flex-wrap gap-1 mt-5 border-t border-slate-100 pt-4">
                  {[
                    { id: 'profile', label: '1. Baseline Setup', icon: Wrench },
                    { id: 'dataset', label: '2. Training Dataset', icon: Database },
                    { id: 'tuning', label: '3. Fine-Tuning Console', icon: Activity },
                    { id: 'sandbox', label: '4. Simulation Sandbox', icon: Sparkles },
                    { id: 'eval', label: '5. Evaluation Studio', icon: Award }
                  ].map((tab) => {
                    const isTabActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        id={`tab-selector-${tab.id}`}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isTabActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <tab.icon className={`w-4 h-4 ${isTabActive ? 'text-white' : 'text-slate-400'}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAB PANEL CONTENTS */}
              <div className="flex-1">
                {activeTab === 'profile' && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">System Prompts Setup</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Review, configure, or rewrite the baseline instructions governing your agent behavior.</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Baseline Instructions (Original Prompt)</label>
                        <span className="text-[10px] text-slate-400 font-mono">Status: {selectedAgent.status === 'trained' ? 'Overridden by optimized model' : 'Active'}</span>
                      </div>
                      <textarea
                        id="baseline-instructions-edit-textarea"
                        value={editedInstructions}
                        onChange={(e) => setEditedInstructions(e.target.value)}
                        placeholder="Define standard baseline system prompt guidelines..."
                        rows={8}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed bg-slate-50 focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div className="flex justify-end gap-3.5 border-t border-slate-100 pt-5">
                      <button
                        id="save-baseline-instructions-btn"
                        onClick={handleSaveInstructions}
                        disabled={updatingAgent || editedInstructions.trim() === selectedAgent.systemInstructions}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
                      >
                        {updatingAgent ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Save & Set Untrained
                          </>
                        )}
                      </button>
                    </div>

                    {selectedAgent.status === 'trained' && selectedAgent.optimizedInstructions && (
                      <div className="mt-6 border-t border-slate-100 pt-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                          <h4 className="font-bold text-slate-900 text-sm">Currently Active "Fine-Tuned" Optimized Instructions</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          This compiled, comprehensive system instruction set was synthesized by our Meta-Prompt optimizer during fine-tuning. It overrides the baseline prompt above:
                        </p>
                        <div className="bg-blue-50/15 border border-blue-100/50 rounded-xl p-4 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {selectedAgent.optimizedInstructions}
                        </div>
                        
                        {selectedAgent.optimizedExemplars && selectedAgent.optimizedExemplars.length > 0 && (
                          <div className="space-y-2.5">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Injected Contextual Few-Shot Exemplars</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedAgent.optimizedExemplars.map((ex, i) => (
                                <div key={ex.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                  <span className="bg-slate-200 text-slate-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                    Example #{i+1}
                                  </span>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Input Query:</span>
                                    <p className="text-[11px] text-slate-800 font-medium bg-white px-2 py-1.5 border border-slate-100 rounded-lg">{ex.input}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-blue-400 font-bold block uppercase tracking-wide">Target Answer:</span>
                                    <p className="text-[11px] text-slate-600 font-mono bg-blue-50/10 px-2 py-1.5 border border-blue-50/20 rounded-lg leading-relaxed">{ex.output}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'dataset' && (
                  <DatasetManager agent={selectedAgent} onUpdate={handleAgentUpdated} />
                )}

                {activeTab === 'tuning' && (
                  <FineTuningPanel agent={selectedAgent} onUpdate={handleAgentUpdated} />
                )}

                {activeTab === 'sandbox' && (
                  <SandboxChat agent={selectedAgent} onUpdate={handleAgentUpdated} />
                )}

                {activeTab === 'eval' && (
                  <EvaluationDashboard agent={selectedAgent} />
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs flex flex-col items-center justify-center min-h-[400px]">
              <Brain className="w-14 h-14 text-slate-200 mb-4" />
              <h3 className="font-extrabold text-slate-800 text-lg">Platform Empty</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1.5 mb-6">
                You currently have no AI Agent profiles registered. Create a profile on the sidebar to unlock the visual model fine-tuning workspace.
              </p>
              <button
                id="empty-workspace-create-btn"
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-white" />
                Register Agent Profile
              </button>
            </div>
          )}

        </div>

      </main>

      {/* 3. Create Agent Modal */}
      {showCreateModal && (
        <AgentForm 
          onClose={() => setShowCreateModal(false)} 
          onSave={handleAgentCreated} 
        />
      )}

      {/* 4. Footer Status Bar from Sleek Theme */}
      <footer id="global-footer" className="h-11 bg-white border-t border-slate-200/80 flex items-center justify-between px-6 text-[11px] font-semibold text-slate-500 shrink-0 mt-6">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Workspace: Connected to fine-tuning node
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-300">|</span>
              Active Agent Profiles: {agents.length}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-300">|</span>
              Total Dataset Size: {totalExamples} samples
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>Region: us-east-1</span>
            <span>Cluster Node: p4d.24xlarge</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
