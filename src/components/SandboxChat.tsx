import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Terminal, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  ArrowUpRight, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  Save, 
  Columns, 
  Eye, 
  Loader2, 
  Info,
  Cpu,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Agent, ChatMessage } from '../types';

interface SandboxChatProps {
  agent: Agent;
  onUpdate: (updatedAgent: Agent) => void;
}

export default function SandboxChat({ agent, onUpdate }: SandboxChatProps) {
  const [userInput, setUserInput] = useState('');
  const [preChatHistory, setPreChatHistory] = useState<ChatMessage[]>([]);
  const [postChatHistory, setPostChatHistory] = useState<ChatMessage[]>([]);
  
  const [loadingPre, setLoadingPre] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  
  const preEndRef = useRef<HTMLDivElement>(null);
  const postEndRef = useRef<HTMLDivElement>(null);

  // Split-screen Layout Mode
  const [layoutMode, setLayoutMode] = useState<'split' | 'pre' | 'post'>('split');
  
  // Interactive Evaluations & Active Learning Loop
  const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({});
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Inline training states for untrained agents
  const [isTuningInline, setIsTuningInline] = useState(false);
  const [tuningLogs, setTuningLogs] = useState<string[]>([]);
  const [tuningProgress, setTuningProgress] = useState(0);

  // Auto scroll
  useEffect(() => {
    preEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [preChatHistory, loadingPre]);

  useEffect(() => {
    postEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [postChatHistory, loadingPost]);

  // Handle direct fine-tuning from Sandbox panel
  const handleInlineFineTune = async () => {
    if (agent.dataset.length < 1) {
      alert('Cannot run fine-tuning with an empty dataset. Please add or import some examples first.');
      return;
    }

    setIsTuningInline(true);
    setTuningProgress(10);
    setTuningLogs([
      '⚡ [SYSTEM] Direct Fine-Tuning initialized inside Sandbox...',
      '📂 [SYSTEM] Parsing active dataset of ' + agent.dataset.length + ' training pairs...',
      '📡 [SYSTEM] Connecting to Cloud GPU host node...'
    ]);

    let progress = 10;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 3;
      if (progress > 90) progress = 90;
      setTuningProgress(progress);
      
      const simulatedLogs = [
        `🧠 [MODEL] Training epoch ${Math.min(5, Math.ceil(progress / 20))}/5 | Tracking alignment loss...`,
        `📈 [TRAINING] Processing backpropagation through attention layers...`,
        `🤖 [SYSTEM] Restructuring optimized system rules...`,
        `💾 [CHECKPOINT] Caching optimized directive weights...`
      ];
      const randomLog = simulatedLogs[Math.floor(Math.random() * simulatedLogs.length)];
      setTuningLogs(prev => [...prev, randomLog]);
    }, 400);

    try {
      const response = await fetch(`/api/agents/${agent.id}/fine-tune`, {
        method: 'POST'
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fine-tuning optimization failed.');
      }

      const data = await response.json();
      setTuningProgress(100);
      setTuningLogs(prev => [
        ...prev,
        '🎉 [SYSTEM] Optimization complete! Dynamic few-shot rules synthesized.',
        '💾 [SYSTEM] Sandbox chatbot upgraded to fine-tuned configuration successfully.'
      ]);

      setTimeout(() => {
        onUpdate(data.agent);
        setIsTuningInline(false);
        setTuningProgress(0);
        setTuningLogs([]);
        setSuccessToast('Agent fine-tuned successfully! Side-by-side comparison is now unlocked.');
        setTimeout(() => setSuccessToast(null), 4000);
      }, 1000);

    } catch (err: any) {
      clearInterval(interval);
      alert(err.message || 'Error running inline fine-tuning.');
      setIsTuningInline(false);
    }
  };

  const handleSend = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const query = customMsg || userInput;
    if (!query.trim()) return;

    if (!customMsg) setUserInput('');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = 'u_' + Math.random().toString(36).substring(2, 9);
    
    const preUserMsg: ChatMessage = { id: userMsgId, sender: 'user', text: query, timestamp };
    const postUserMsg: ChatMessage = { id: userMsgId, sender: 'user', text: query, timestamp };

    setPreChatHistory(prev => [...prev, preUserMsg]);
    setPostChatHistory(prev => [...prev, postUserMsg]);

    // 1. Fetch PRE-tuned response
    setLoadingPre(true);
    const preHistoryPayload = preChatHistory.slice(-6);
    
    const fetchPre = async () => {
      try {
        const response = await fetch(`/api/agents/${agent.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            mode: 'pre',
            history: preHistoryPayload
          })
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        setPreChatHistory(prev => [...prev, {
          id: 'pre_' + Math.random().toString(36).substring(2, 9),
          sender: 'agent_pre',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } catch (err) {
        setPreChatHistory(prev => [...prev, {
          id: 'pre_err',
          sender: 'agent_pre',
          text: '⚠️ Failed to connect to pre-tuned baseline model. Ensure GEMINI_API_KEY is configured.',
          timestamp
        }]);
      } finally {
        setLoadingPre(false);
      }
    };

    // 2. Fetch POST-tuned response (if trained)
    const fetchPost = async () => {
      if (agent.status !== 'trained') return;
      
      setLoadingPost(true);
      const postHistoryPayload = postChatHistory.slice(-6);

      try {
        const response = await fetch(`/api/agents/${agent.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            mode: 'post',
            history: postHistoryPayload
          })
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        setPostChatHistory(prev => [...prev, {
          id: 'post_' + Math.random().toString(36).substring(2, 9),
          sender: 'agent_post',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } catch (err) {
        setPostChatHistory(prev => [...prev, {
          id: 'post_err',
          sender: 'agent_post',
          text: '⚠️ Failed to connect to optimized fine-tuned agent.',
          timestamp
        }]);
      } finally {
        setLoadingPost(false);
      }
    };

    await Promise.all([fetchPre(), fetchPost()]);
  };

  const clearChats = () => {
    setPreChatHistory([]);
    setPostChatHistory([]);
    setRatings({});
  };

  const handleRate = (msgId: string, value: 'up' | 'down') => {
    setRatings(prev => ({
      ...prev,
      [msgId]: prev[msgId] === value ? undefined : value // toggle
    }));
  };

  // Find the closest prompt user typed for this response
  const getPromptForMessage = (msgId: string, history: ChatMessage[]) => {
    const idx = history.findIndex(m => m.id === msgId);
    if (idx === -1) return '';
    for (let i = idx - 1; i >= 0; i--) {
      if (history[i].sender === 'user') {
        return history[i].text;
      }
    }
    return '';
  };

  // Save conversation interaction as a new training row
  const handleSaveToDataset = async (msg: ChatMessage, history: ChatMessage[]) => {
    const prompt = getPromptForMessage(msg.id, history);
    if (!prompt) {
      alert('Could not map response to its prompt.');
      return;
    }

    setSavingMessageId(msg.id);
    try {
      const newEntry = {
        id: 'sandbox_' + Math.random().toString(36).substring(2, 11),
        input: prompt,
        output: msg.text,
        category: agent.serviceTask
      };

      const updatedDataset = [...agent.dataset, newEntry];

      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset: updatedDataset,
          status: 'untrained' // mark back to untrained since dataset was augmented
        })
      });

      if (!response.ok) throw new Error('Failed to save to dataset.');
      const data = await response.json();
      onUpdate(data);
      
      setSuccessToast('Interaction saved to training set successfully! Agent is set to untrained so you can re-tune with this new exemplar.');
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Error saving to dataset.');
    } finally {
      setSavingMessageId(null);
    }
  };

  // Compute stats on active chat session
  const wordCount = (text: string) => text ? text.split(/\s+/).filter(Boolean).length : 0;
  
  const getComparisonStats = () => {
    const preReplies = preChatHistory.filter(m => m.sender === 'agent_pre');
    const postReplies = postChatHistory.filter(m => m.sender === 'agent_post');
    if (preReplies.length === 0 || postReplies.length === 0) return null;
    
    let totalPreWords = 0;
    let totalPostWords = 0;
    preReplies.forEach(m => totalPreWords += wordCount(m.text));
    postReplies.forEach(m => totalPostWords += wordCount(m.text));
    
    const avgPreWords = Math.round(totalPreWords / preReplies.length);
    const avgPostWords = Math.round(totalPostWords / postReplies.length);
    
    // Count markdown code blocks in post vs pre
    let preCodeBlocks = 0;
    let postCodeBlocks = 0;
    preReplies.forEach(m => { if (m.text.includes('```')) preCodeBlocks++; });
    postReplies.forEach(m => { if (m.text.includes('```')) postCodeBlocks++; });

    return {
      avgPreWords,
      avgPostWords,
      preCodeBlocks,
      postCodeBlocks,
      totalInteractions: preReplies.length
    };
  };

  const comparisonStats = getComparisonStats();

  // Aggregate user thumbs scores
  const getRatingsSummary = () => {
    let preUp = 0, preDown = 0, postUp = 0, postDown = 0;
    Object.entries(ratings).forEach(([id, val]) => {
      if (id.startsWith('pre_')) {
        if (val === 'up') preUp++;
        if (val === 'down') preDown++;
      } else if (id.startsWith('post_')) {
        if (val === 'up') postUp++;
        if (val === 'down') postDown++;
      }
    });
    return { preUp, preDown, postUp, postDown };
  };

  const ratingsSummary = getRatingsSummary();

  return (
    <div id="sandbox-chat-panel" className="space-y-4 flex flex-col h-[calc(100vh-210px)] min-h-[550px]">
      
      {/* Toast Notifications */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center justify-between gap-3 animate-slideIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-white" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-[10px] text-white hover:underline uppercase font-bold tracking-wide">
            Dismiss
          </button>
        </div>
      )}

      {/* Control Banner & View Switcher */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
            <Terminal className="w-4.5 h-4.5 text-blue-600" />
            Dual Simulation Sandbox
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test and evaluate prompt tuning and instructions alignment side-by-side.
          </p>
        </div>

        {/* Dynamic Controls / Tab Toggle */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="layout-split-btn"
              onClick={() => setLayoutMode('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'split' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Compare side-by-side"
            >
              <Columns className="w-3.5 h-3.5" />
              Split Screen
            </button>
            <button
              id="layout-pre-btn"
              onClick={() => setLayoutMode('pre')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'pre' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Show baseline agent instructions output"
            >
              <Eye className="w-3.5 h-3.5" />
              Baseline
            </button>
            <button
              id="layout-post-btn"
              onClick={() => setLayoutMode('post')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'post' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Show fine-tuned optimized outputs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fine-Tuned
            </button>
          </div>

          <button
            id="clear-sandbox-chats-btn"
            onClick={clearChats}
            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Suggested Prompts Grid */}
      {agent.dataset.length > 0 && (
        <div className="shrink-0 space-y-1">
          <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Suggested Test Prompts:</span>
          <div className="flex flex-wrap gap-2">
            {agent.dataset.slice(0, 3).map((item) => (
              <button
                key={item.id}
                id={`suggested-prompt-btn-${item.id}`}
                onClick={() => handleSend(undefined, item.input)}
                className="bg-blue-50/40 hover:bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-full text-[11px] font-semibold text-left max-w-sm truncate transition-all flex items-center gap-1 cursor-pointer"
              >
                {item.input}
                <ArrowUpRight className="w-3 h-3 text-blue-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Comparative Metric Bar */}
      {comparisonStats && (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl border border-slate-100 p-3 flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Active Session Diagnostics:
          </span>
          <div className="flex flex-wrap items-center gap-6 font-medium text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Avg Output Length:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                Baseline <strong className="text-slate-700">{comparisonStats.avgPreWords}w</strong> vs Fine-Tuned <strong className="text-blue-600">{comparisonStats.avgPostWords}w</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Code Block Alignment:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                Baseline <strong className="text-slate-700">{comparisonStats.preCodeBlocks}</strong> vs Fine-Tuned <strong className="text-blue-600">{comparisonStats.postCodeBlocks}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">User Approvals:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                Baseline <strong className="text-slate-700">👍 {ratingsSummary.preUp}</strong> vs Fine-Tuned <strong className="text-emerald-600">👍 {ratingsSummary.postUp}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chat Simulation Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden relative">
        
        {/* LEFT STREAM: Pre-tuned Baseline */}
        {(layoutMode === 'split' || layoutMode === 'pre') && (
          <div className="border border-slate-200 rounded-2xl bg-white flex flex-col overflow-hidden shadow-2xs relative">
            
            {/* Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span className="font-bold text-slate-700 text-xs">Baseline Agent (Untrained)</span>
              </div>
              <div className="flex items-center gap-2">
                {ratingsSummary.preUp > 0 && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                    👍 {ratingsSummary.preUp}
                  </span>
                )}
                <span className="text-[9px] bg-slate-200 text-slate-600 font-mono px-1.5 py-0.5 rounded font-bold">
                  PRE-TUNED
                </span>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
              {preChatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Terminal className="w-8 h-8 text-slate-300 mb-2" />
                  <span className="text-xs font-semibold">Baseline Sandbox Stream</span>
                  <span className="text-[10px] text-slate-400 max-w-xs mt-1">
                    Send a test query to see how the default model answers before aligning with specialized guidelines.
                  </span>
                </div>
              ) : (
                preChatHistory.map((msg, index) => (
                  <div key={`${msg.id}_pre_${index}`} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-3xs ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none font-sans font-medium border border-slate-200/50'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className="block text-[8px] text-right mt-1 opacity-50 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Meta Controls */}
                    {msg.sender !== 'user' && msg.id !== 'pre_err' && (
                      <div className="flex items-center gap-2 mt-1 px-1 text-[10px]">
                        <button
                          onClick={() => handleRate(msg.id, 'up')}
                          className={`p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                            ratings[msg.id] === 'up' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-400'
                          }`}
                          title="Grade response: Good"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRate(msg.id, 'down')}
                          className={`p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                            ratings[msg.id] === 'down' ? 'text-red-500 font-bold bg-red-50' : 'text-slate-400'
                          }`}
                          title="Grade response: Poor"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                        <span className="text-slate-200">|</span>
                        
                        <button
                          onClick={() => handleSaveToDataset(msg, preChatHistory)}
                          disabled={savingMessageId !== null}
                          className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          title="Save this reply to dataset"
                        >
                          {savingMessageId === msg.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save to Dataset
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {loadingPre && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-400 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-1.5">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              )}
              <div ref={preEndRef} />
            </div>
          </div>
        )}

        {/* RIGHT STREAM: Optimized Fine-Tuned */}
        {(layoutMode === 'split' || layoutMode === 'post') && (
          <div className="border border-blue-200 rounded-2xl bg-white flex flex-col overflow-hidden shadow-2xs relative">
            
            {/* INLINE TRAINING OR LOCK SCREEN */}
            {agent.status !== 'trained' && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs z-20 flex flex-col items-center justify-center text-center p-6 text-white overflow-y-auto">
                {isTuningInline ? (
                  // Tuning compiler running in real-time
                  <div className="w-full max-w-sm space-y-5 px-4">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="p-3 bg-blue-500 text-white rounded-full animate-pulse">
                        <Cpu className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Compiling Instruction Weights...</h4>
                      <p className="text-xs text-slate-400">Synthesizing perfect prompt rules across dataset examples</p>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between text-[10px] text-slate-300 font-bold">
                        <span>ALIGNMENT OPTIMIZATION</span>
                        <span className="font-mono">{tuningProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${tuningProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Logs output */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-left space-y-1 max-h-44 overflow-y-auto scrollbar-thin text-blue-300">
                      {tuningLogs.map((log, idx) => (
                        <div key={idx} className="leading-relaxed whitespace-pre-wrap">{log}</div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Locked state with an Upgrade trigger button
                  <div className="space-y-5 max-w-xs text-center">
                    <div className="mx-auto p-3.5 bg-amber-500/10 text-amber-400 rounded-full w-14 h-14 flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Compare Fine-Tuning Locked</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        You must tune your agent instructions before side-by-side chatbot simulation can compare alignment results.
                      </p>
                    </div>

                    <button
                      id="inline-fine-tune-btn"
                      onClick={handleInlineFineTune}
                      disabled={agent.dataset.length < 1}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Sparkles className="w-4 h-4" />
                      ⚡ Optimize & Align Now ({agent.dataset.length} samples)
                    </button>

                    {agent.dataset.length === 0 && (
                      <p className="text-[10px] text-amber-400">
                        * Add at least 1 exemplar row to the "Training Dataset" tab first.
                      </p>
                    )}

                    <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-left">
                      <span className="text-[9.5px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">How Tuning Works</span>
                      <span className="text-[10px] text-slate-300 leading-relaxed block">
                        Our Meta-Tuner synthesizes your few-shot samples and custom rules into a bulletproof instruction framework.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Header */}
            <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="font-bold text-blue-800 text-xs flex items-center gap-1">
                  Optimized Agent (Trained)
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                {ratingsSummary.postUp > 0 && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                    👍 {ratingsSummary.postUp}
                  </span>
                )}
                <span className="text-[9px] bg-blue-600 text-white font-mono px-1.5 py-0.5 rounded font-bold">
                  POST-TUNED
                </span>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
              {postChatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Sparkles className="w-8 h-8 text-blue-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-600">Optimized Sandbox Stream</span>
                  <span className="text-[10px] text-slate-400 max-w-xs mt-1">
                    Once active, this model matches responses to your high-performance synthesized meta-directives.
                  </span>
                </div>
              ) : (
                postChatHistory.map((msg, index) => (
                  <div key={`${msg.id}_post_${index}`} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-3xs ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-br-none'
                        : 'bg-blue-50/70 text-slate-850 border border-blue-100/50 rounded-bl-none font-sans font-medium'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className="block text-[8px] text-right mt-1 opacity-50 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Meta Controls */}
                    {msg.sender !== 'user' && msg.id !== 'post_err' && (
                      <div className="flex items-center gap-2 mt-1 px-1 text-[10px]">
                        <button
                          onClick={() => handleRate(msg.id, 'up')}
                          className={`p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer ${
                            ratings[msg.id] === 'up' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-400'
                          }`}
                          title="Grade response: Good"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRate(msg.id, 'down')}
                          className={`p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer ${
                            ratings[msg.id] === 'down' ? 'text-red-500 font-bold bg-red-50' : 'text-slate-400'
                          }`}
                          title="Grade response: Poor"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                        <span className="text-slate-200">|</span>
                        
                        <button
                          onClick={() => handleSaveToDataset(msg, postChatHistory)}
                          disabled={savingMessageId !== null}
                          className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          title="Save this reply to dataset"
                        >
                          {savingMessageId === msg.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save to Dataset
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {loadingPost && (
                <div className="flex justify-start">
                  <div className="bg-blue-50 text-blue-400 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-1.5 border border-blue-100/50">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              )}
              <div ref={postEndRef} />
            </div>
          </div>
        )}

      </div>

      {/* Shared bottom input bar */}
      <form onSubmit={handleSend} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 shrink-0">
        <input
          id="sandbox-chat-input"
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={
            agent.status === 'trained'
              ? "Type a query to send to BOTH models side-by-side..."
              : "Type a query to test against the baseline model..."
          }
          className="flex-1 bg-transparent px-2.5 py-1.5 focus:outline-none text-xs text-slate-800 placeholder-slate-400"
          disabled={loadingPre || loadingPost}
        />
        <button
          id="submit-sandbox-chat-btn"
          type="submit"
          disabled={loadingPre || loadingPost || !userInput.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>

    </div>
  );
}
