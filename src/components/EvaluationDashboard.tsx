import React, { useState, useEffect } from 'react';
import { Award, BarChart3, AlertTriangle, ShieldCheck, Clock, CheckCircle, RefreshCw, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Agent, EvalReport } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface EvaluationDashboardProps {
  agent: Agent;
}

export default function EvaluationDashboard({ agent }: EvaluationDashboardProps) {
  const [report, setReport] = useState<EvalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [error, setError] = useState('');
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  // Fetch report on load or when agent changes
  useEffect(() => {
    fetchReport();
  }, [agent.id]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reports/${agent.id}`);
      if (!response.ok) {
        setReport(null);
        return;
      }
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (agent.status !== 'trained') {
      setError('You must complete training/fine-tuning before running batch evaluations.');
      return;
    }
    if (agent.dataset.length === 0) {
      setError('Your training dataset is empty. Please add or generate examples first.');
      return;
    }

    setRunningEval(true);
    setError('');
    try {
      const response = await fetch(`/api/agents/${agent.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to complete evaluation.');
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Evaluation run failed.');
    } finally {
      setRunningEval(false);
    }
  };

  // Format metrics data for Recharts
  const getChartData = () => {
    if (!report) return [];
    return [
      { name: 'Accuracy', Pre: report.metrics.accuracy.pre, Post: report.metrics.accuracy.post },
      { name: 'Tone/Style', Pre: report.metrics.tone.pre, Post: report.metrics.tone.post },
      { name: 'Compliance', Pre: report.metrics.compliance.pre, Post: report.metrics.compliance.post },
      { name: 'Latency Score', Pre: report.metrics.latency.pre, Post: report.metrics.latency.post },
    ];
  };

  const toggleExpandCase = (id: string) => {
    if (expandedCase === id) {
      setExpandedCase(null);
    } else {
      setExpandedCase(id);
    }
  };

  return (
    <div id="evaluation-dashboard-panel" className="space-y-6">
      
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase mb-2 inline-block">
              Agent Audit & Benchmarks
            </span>
            <h2 className="text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
              <Award className="w-5.5 h-5.5 text-blue-400" />
              Automated Evaluation Studio
            </h2>
            <p className="text-xs text-slate-300">
              Run batch evaluation suites to compute exact quality benchmarks. An objective LLM-as-a-judge audits Pre-tuned vs Post-tuned results.
            </p>
          </div>
          <div>
            <button
              id="run-evaluation-btn"
              onClick={handleRunEvaluation}
              disabled={runningEval || agent.status !== 'trained'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {runningEval ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Auditing Models (Judge is active)...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-white" />
                  Run Batch Audit
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      {/* Main comparative screen if report exists */}
      {!report ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 shadow-xs text-center flex flex-col items-center justify-center min-h-[300px]">
          <BarChart3 className="w-12 h-12 text-slate-300 mb-3 animate-pulse" />
          <h3 className="font-semibold text-slate-800 text-sm">No Benchmark Audits Available</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5 leading-relaxed">
            {agent.status === 'trained'
              ? 'This agent is trained! Execute a Batch Audit above to let our LLM Judge grade the before and after model responses.'
              : 'You must fine-tune/train this agent first before benchmark evaluations can be calculated.'}
          </p>
          {agent.status !== 'trained' && (
            <div className="bg-amber-50 text-amber-700 border border-amber-100 rounded-xl p-3.5 max-w-sm text-left text-xs space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Fine-tuning required
              </span>
              <span className="text-[11px] text-amber-600 block leading-relaxed">
                Evaluations compare pre-tuned baseline model output with optimized fine-tuned models. Complete training in the training panel first.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left column: Benchmarks Summary */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* KPI Cards */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
              <span className="block text-xs font-semibold text-slate-700">Audit Scorecard</span>
              
              <div className="grid grid-cols-2 gap-3.5 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Baseline</span>
                  <span className="text-3xl font-mono font-bold text-slate-500">{report.avgScorePre}/100</span>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">Fine-Tuned</span>
                  <span className="text-3xl font-mono font-bold text-blue-600">{report.avgScorePost}/100</span>
                </div>
              </div>

              {/* Lift calculator */}
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Agent Quality Increase
                </span>
                <span className="font-mono font-bold text-sm">
                  +{Math.round(((report.avgScorePost - report.avgScorePre) / (report.avgScorePre || 1)) * 100)}% Lift
                </span>
              </div>
            </div>

            {/* Quick Metrics Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-3">
              <span className="block text-xs font-semibold text-slate-700">Dimension Metrics Lift</span>
              <div className="space-y-2.5">
                {[
                  { name: 'Accuracy', pre: report.metrics.accuracy.pre, post: report.metrics.accuracy.post, icon: ShieldCheck, color: 'bg-emerald-500' },
                  { name: 'Tone Consistency', pre: report.metrics.tone.pre, post: report.metrics.tone.post, icon: Sparkles, color: 'bg-blue-500' },
                  { name: 'Corporate Compliance', pre: report.metrics.compliance.pre, post: report.metrics.compliance.post, icon: ShieldCheck, color: 'bg-indigo-500' },
                  { name: 'Speed Benchmark', pre: report.metrics.latency.pre, post: report.metrics.latency.post, icon: Clock, color: 'bg-amber-500' }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-400">{item.pre}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-blue-600 font-bold">{item.post}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column 2/3: Chart and Audit Cases */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual Recharts Bar Graph */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <h3 className="font-semibold text-slate-900 text-sm mb-4">Quality Dimension Lift Graph</h3>
              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getChartData()}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Pre" fill="#94a3b8" name="Baseline Agent" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Post" fill="#2563eb" name="Fine-Tuned Agent" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expandable Case studies */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Detailed Audit Log ({report.examples.length} Cases)</h3>
                <p className="text-xs text-slate-400">Expand rows to inspect LLM Judge scores and comments on individual inquiries</p>
              </div>

              <div className="space-y-3">
                {report.examples.map((item, index) => {
                  const isExpanded = expandedCase === item.id;
                  return (
                    <div key={item.id} className="border border-slate-100 rounded-xl overflow-hidden transition-all bg-slate-50/20">
                      
                      {/* Summary Toggle Header */}
                      <button
                        id={`case-toggle-btn-${item.id}`}
                        onClick={() => toggleExpandCase(item.id)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded-lg font-bold">
                            Case #{index + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 max-w-md truncate">
                            {item.input}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-slate-400 font-medium">{item.preScore}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/50">{item.postScore}</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>

                      {/* Expanded View */}
                      {isExpanded && (
                        <div className="px-5 py-4 border-t border-slate-100 bg-white space-y-4 text-xs">
                          {/* Ground Truth */}
                          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expected Ideal Response:</span>
                            <p className="text-slate-700 font-mono whitespace-pre-wrap">{item.expected}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Pre Tuned outputs */}
                            <div className="space-y-2 border border-slate-100 rounded-xl p-3.5 bg-slate-50/30">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Baseline Output:</span>
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Grade: {item.preScore}/100</span>
                              </div>
                              <p className="text-slate-600 whitespace-pre-wrap italic">{item.preOutput}</p>
                              <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 leading-relaxed">
                                <span className="font-bold block text-slate-500 mb-0.5">Judge Feedback:</span>
                                {item.preFeedback}
                              </div>
                            </div>

                            {/* Post Tuned outputs */}
                            <div className="space-y-2 border border-blue-100/60 rounded-xl p-3.5 bg-blue-50/5">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Fine-Tuned Output:</span>
                                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/30 font-bold">Grade: {item.postScore}/100</span>
                              </div>
                              <p className="text-slate-800 whitespace-pre-wrap font-mono leading-relaxed bg-blue-50/10 p-2.5 rounded-lg border border-blue-50/20">{item.postOutput}</p>
                              <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 leading-relaxed">
                                <span className="font-bold block text-blue-500 mb-0.5">Judge Feedback:</span>
                                {item.postFeedback}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
