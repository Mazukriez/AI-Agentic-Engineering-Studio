import React, { useState } from 'react';
import { X, Plus, Sparkles, Brain } from 'lucide-react';
import { Agent } from '../types';

interface AgentFormProps {
  onClose: () => void;
  onSave: (agent: Agent) => void;
}

export default function AgentForm({ onClose, onSave }: AgentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serviceTask, setServiceTask] = useState('Customer Support');
  const [baseModel, setBaseModel] = useState('gemini-3.5-flash');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !serviceTask.trim() || !systemInstructions.trim()) {
      setError('Please fill in all required fields (Name, Service Task, and System Instructions).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          serviceTask,
          baseModel,
          systemInstructions
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create agent.');
      }

      const newAgent = await response.json();
      onSave(newAgent);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (presetName: string) => {
    if (presetName === 'support') {
      setName('Tech Support Agent');
      setDescription('Automated help desk for solving networking and software configuration bugs.');
      setServiceTask('Technical Bug Resolving');
      setSystemInstructions('Answer the user\'s support question. Solve their computer bugs.');
    } else if (presetName === 'sales') {
      setName('Sales Appointment Setter');
      setDescription('Engages outbound leads to qualify them and book a live demo on Google Calendar.');
      setServiceTask('Sales Qualification & Booking');
      setSystemInstructions('Try to sell our product. Ask them to schedule a call if they are interested.');
    }
  };

  return (
    <div id="agent-form-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div id="agent-form-card" className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">Create New AI Agent</h3>
              <p className="text-xs text-slate-500">Design a custom agent optimized for specific business tasks</p>
            </div>
          </div>
          <button 
            id="close-agent-form-btn"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Presets */}
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick Presets
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="preset-support-btn"
                type="button"
                onClick={() => loadPreset('support')}
                className="p-3 text-left border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/20 transition-all text-xs"
              >
                <span className="font-medium text-slate-800 block mb-0.5">💻 Tech Help Desk</span>
                <span className="text-slate-500">Resolve computer & hardware issues.</span>
              </button>
              <button
                id="preset-sales-btn"
                type="button"
                onClick={() => loadPreset('sales')}
                className="p-3 text-left border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/20 transition-all text-xs"
              >
                <span className="font-medium text-slate-800 block mb-0.5">💰 Appointment Setter</span>
                <span className="text-slate-500">Engage and qualify sales opportunities.</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Name & Task */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Agent Name *
              </label>
              <input
                id="agent-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SQL Expert"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Service Task *
              </label>
              <input
                id="agent-task-input"
                type="text"
                value={serviceTask}
                onChange={(e) => setServiceTask(e.target.value)}
                placeholder="e.g. SQL Generation"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <input
              id="agent-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief summary of what this agent is supposed to do..."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Base Model */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Base LLM Model
            </label>
            <select
              id="agent-model-select"
              value={baseModel}
              onChange={(e) => setBaseModel(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="gemini-3.5-flash">gemini-3.5-flash (Standard & Rapid)</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Expert reasoning)</option>
              <option value="GPT-4o">GPT-4o (Standard enterprise)</option>
              <option value="Llama-3-70B">Llama-3-70B (Open weights prior)</option>
            </select>
          </div>

          {/* System Instructions */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Baseline System Instructions *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Will be optimized during fine-tuning</span>
            </div>
            <textarea
              id="agent-instructions-textarea"
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              placeholder="Explain what the agent should do, its basic rules and behavior. (e.g. 'Answer SQL requests politely')"
              rows={4}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-mono text-xs leading-relaxed"
              required
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              id="cancel-create-agent-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-create-agent-btn"
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Agent
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
