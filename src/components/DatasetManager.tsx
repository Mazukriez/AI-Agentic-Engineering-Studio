import React, { useState, useRef } from 'react';
import { Sparkles, Plus, Trash, Database, HelpCircle, Loader2, ArrowRight, Upload, FileText, Check, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { Agent, DatasetEntry } from '../types';

// Robust CSV parser supporting quotes, commas, and newlines inside cells
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentVal.trim());
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  if (row.length > 1 || currentVal !== '') {
    row.push(currentVal.trim());
    lines.push(row);
  }
  
  return lines;
}

interface DatasetManagerProps {
  agent: Agent;
  onUpdate: (updatedAgent: Agent) => void;
}

export default function DatasetManager({ agent, onUpdate }: DatasetManagerProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Synthetic Generator State
  const [syntheticCount, setSyntheticCount] = useState(5);
  const [syntheticGuidelines, setSyntheticGuidelines] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // CSV Import State
  const [isCsvMode, setIsCsvMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [inputColIdx, setInputColIdx] = useState<number>(-1);
  const [outputColIdx, setOutputColIdx] = useState<number>(-1);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !output.trim()) return;

    setError('');
    setSuccessMsg('');

    const newExample: DatasetEntry = {
      id: 'man_' + Math.random().toString(36).substring(2, 11),
      input: input.trim(),
      output: output.trim(),
      category: agent.serviceTask
    };

    const updatedDataset = [...agent.dataset, newExample];

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: updatedDataset, status: 'untrained' }), // Set back to untrained when dataset changes
      });

      if (!response.ok) throw new Error('Failed to add example.');
      
      const updated = await response.json();
      onUpdate(updated);
      setInput('');
      setOutput('');
      setIsAdding(false);
      setSuccessMsg('Manual training example added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving example.');
    }
  };

  const handleDelete = async (exampleId: string) => {
    setError('');
    setSuccessMsg('');
    const updatedDataset = agent.dataset.filter(item => item.id !== exampleId);

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: updatedDataset, status: agent.dataset.length === 1 ? 'untrained' : agent.status }),
      });

      if (!response.ok) throw new Error('Failed to delete example.');

      const updated = await response.json();
      onUpdate(updated);
      setSuccessMsg('Example deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error deleting example.');
    }
  };

  const handleGenerateSynthetic = async () => {
    setIsGenerating(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await fetch(`/api/agents/${agent.id}/generate-dataset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: syntheticCount,
          guidelines: syntheticGuidelines
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate synthetic data.');
      }

      const data = await response.json();
      // Update agent state
      const updatedAgent = { ...agent, dataset: data.dataset, status: 'untrained' as const };
      onUpdate(updatedAgent);
      
      setSuccessMsg(`Successfully generated ${data.added.length} synthetic high-quality examples with Gemini!`);
      setSyntheticGuidelines('');
    } catch (err: any) {
      setError(err.message || 'Failed to trigger dataset generator.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCSVFile = (file: File) => {
    setError('');
    setSuccessMsg('');
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setError('Please select a valid CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setError('The selected file is empty.');
        return;
      }

      try {
        const parsed = parseCSV(text);
        if (parsed.length < 2) {
          setError('CSV must contain a header row and at least one data row.');
          return;
        }

        const headers = parsed[0];
        const rows = parsed.slice(1);

        setCsvHeaders(headers);
        setCsvRows(rows);

        // Auto-detect columns
        let autoInputIdx = -1;
        let autoOutputIdx = -1;

        headers.forEach((h, idx) => {
          const lower = h.toLowerCase().trim();
          if (lower === 'input' || lower === 'prompt' || lower === 'instruction' || lower === 'query' || lower === 'question' || lower === 'text') {
            if (autoInputIdx === -1) autoInputIdx = idx;
          }
          if (lower === 'output' || lower === 'response' || lower === 'target' || lower === 'completion' || lower === 'answer' || lower === 'reply') {
            if (autoOutputIdx === -1) autoOutputIdx = idx;
          }
        });

        // Fallbacks if not auto-detected
        if (autoInputIdx === -1) autoInputIdx = 0;
        if (autoOutputIdx === -1) {
          autoOutputIdx = headers.length > 1 ? 1 : 0;
        }

        setInputColIdx(autoInputIdx);
        setOutputColIdx(autoOutputIdx);
      } catch (err) {
        setError('Error parsing CSV file. Please make sure it is a valid format.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCSVFile(e.target.files[0]);
    }
  };

  const handleConfirmCSVImport = async () => {
    if (inputColIdx === -1 || outputColIdx === -1) {
      setError('Please map both user input and target response columns.');
      return;
    }
    if (inputColIdx === outputColIdx) {
      setError('Input and Output columns cannot be the same.');
      return;
    }

    setIsImporting(true);
    setError('');
    setSuccessMsg('');

    // Generate import list
    const importedEntries: DatasetEntry[] = [];
    csvRows.forEach((row, rowIdx) => {
      const inputVal = row[inputColIdx] || '';
      const outputVal = row[outputColIdx] || '';
      
      if (inputVal.trim() && outputVal.trim()) {
        importedEntries.push({
          id: 'csv_' + Math.random().toString(36).substring(2, 11) + '_' + rowIdx,
          input: inputVal.trim(),
          output: outputVal.trim(),
          category: agent.serviceTask
        });
      }
    });

    if (importedEntries.length === 0) {
      setError('No valid rows with both non-empty input and output were found in the CSV.');
      setIsImporting(false);
      return;
    }

    const updatedDataset = [...agent.dataset, ...importedEntries];

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: updatedDataset, status: 'untrained' }),
      });

      if (!response.ok) throw new Error('Failed to bulk import CSV examples.');

      const updated = await response.json();
      onUpdate(updated);
      
      // Reset states
      setCsvHeaders([]);
      setCsvRows([]);
      setIsCsvMode(false);
      setSuccessMsg(`Successfully imported ${importedEntries.length} training examples from CSV!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error importing CSV dataset.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetCSV = () => {
    setCsvHeaders([]);
    setCsvRows([]);
    setInputColIdx(-1);
    setOutputColIdx(-1);
  };

  return (
    <div id="dataset-manager-panel" className="space-y-6">
      
      {/* Banner / Status */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 blur-xl w-60 h-60 bg-blue-500 rounded-full"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase mb-2 inline-block">
              Dataset Studio
            </span>
            <h2 className="text-xl font-bold tracking-tight mb-1.5 flex items-center gap-2">
              <Database className="w-5.5 h-5.5 text-blue-400" />
              Train-Set Manager
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              An agent's performance depends entirely on high-quality input/output pairs. Supply ideal guidelines, import custom prompts, or generate synthetic examples below.
            </p>
          </div>
          <div className="bg-slate-800/60 rounded-xl px-5 py-3 border border-slate-700/50 text-center self-start md:self-auto min-w-[120px]">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Dataset Size</span>
            <span className="text-2xl font-mono font-bold text-white">{agent.dataset.length}</span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Target: 3+ examples</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 font-medium animate-pulse">
          {successMsg}
        </div>
      )}

      {/* Grid: Left column Dataset view, Right column Synthetic generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2/3: Existing Examples List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start md:items-center gap-3 mb-5">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Training Pairs ({agent.dataset.length})</h3>
                <p className="text-xs text-slate-400">Ground-truth exemplars governing agent response tuning</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="toggle-add-manual-btn"
                  onClick={() => {
                    setIsAdding(!isAdding);
                    setIsCsvMode(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                    isAdding
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Add Manual
                </button>
                <button
                  id="toggle-csv-import-btn"
                  onClick={() => {
                    setIsCsvMode(!isCsvMode);
                    setIsAdding(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                    isCsvMode
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Bulk Import (CSV)
                </button>
              </div>
            </div>

            {/* CSV Import Panel */}
            {isCsvMode && (
              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 mb-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-500" />
                    Bulk Import via CSV
                  </span>
                  <button
                    id="csv-close-btn"
                    onClick={() => {
                      setIsCsvMode(false);
                      handleResetCSV();
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Close
                  </button>
                </div>

                {/* Drag and Drop Zone */}
                {csvRows.length === 0 ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50/30'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Drag & drop your CSV file here or <span className="text-blue-600 underline">browse</span></span>
                      <span className="text-[10px] text-slate-400">Supports standard CSV file parsing</span>
                    </div>
                  </div>
                ) : (
                  // CSV Mapping and Preview Step
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100/50 text-xs text-slate-600 flex items-start gap-2.5">
                      <Info className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 block mb-0.5">CSV File Loaded Successfully!</span>
                        Parsed <strong className="font-semibold text-slate-900">{csvRows.length}</strong> rows of training examples. Now map the CSV columns to match agent training schema.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Input Col Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Map Input Prompt Column</label>
                        <select
                          id="csv-input-col-select"
                          value={inputColIdx}
                          onChange={(e) => setInputColIdx(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                        >
                          <option value="-1" disabled>-- Choose column --</option>
                          {csvHeaders.map((header, idx) => (
                            <option key={idx} value={idx}>
                              {header} (e.g. "{csvRows[0]?.[idx]?.substring(0, 30) || ''}...")
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Output Col Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Map Perfect Output Column</label>
                        <select
                          id="csv-output-col-select"
                          value={outputColIdx}
                          onChange={(e) => setOutputColIdx(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                        >
                          <option value="-1" disabled>-- Choose column --</option>
                          {csvHeaders.map((header, idx) => (
                            <option key={idx} value={idx}>
                              {header} (e.g. "{csvRows[0]?.[idx]?.substring(0, 30) || ''}...")
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Preview Table of First 3 Items */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Mapping preview (First 3 rows)
                      </div>
                      <div className="divide-y divide-slate-100 text-xs max-h-56 overflow-y-auto">
                        {csvRows.slice(0, 3).map((row, idx) => {
                          const inputVal = row[inputColIdx] || '—';
                          const outputVal = row[outputColIdx] || '—';
                          return (
                            <div key={idx} className="p-3 grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Input Prompt</span>
                                <p className="text-slate-750 line-clamp-2 italic font-medium">"{inputVal}"</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-blue-400 block uppercase tracking-wider">Ideal Output</span>
                                <p className="text-slate-600 line-clamp-2 italic font-mono">"{outputVal}"</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                      <button
                        id="csv-reset-btn"
                        type="button"
                        onClick={handleResetCSV}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline flex items-center gap-1 cursor-pointer"
                      >
                        Reset / Choose Different File
                      </button>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          id="csv-cancel-btn"
                          type="button"
                          onClick={() => {
                            setIsCsvMode(false);
                            handleResetCSV();
                          }}
                          className="w-1/2 sm:w-auto px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors text-center"
                        >
                          Cancel
                        </button>
                        <button
                          id="csv-confirm-import-btn"
                          type="button"
                          onClick={handleConfirmCSVImport}
                          disabled={isImporting}
                          className="w-1/2 sm:w-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isImporting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Confirm & Import {csvRows.length} Rows
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add Manual Form */}
            {isAdding && (
              <form onSubmit={handleAddManual} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 mb-4 space-y-3">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide">New Manual Entry</span>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">User Input (Prompt)</label>
                  <input
                    id="manual-input-prompt"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. Can you refund order 123?"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Perfect Target Response (Ideal Output)</label>
                  <textarea
                    id="manual-output-response"
                    value={output}
                    onChange={(e) => setOutput(e.target.value)}
                    placeholder="What the fine-tuned agent should reply with..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    id="cancel-manual-add"
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-[11px] font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-manual-add"
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            {agent.dataset.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                <Database className="w-10 h-10 text-slate-300 mb-3" />
                <span className="block font-medium text-slate-700 text-sm mb-1">Dataset is Empty</span>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Add custom training prompts manually or use the Synthetic Generator to bootstrap high-quality training pairs instantly.
                </p>
                <div className="flex gap-2">
                  <button
                    id="empty-dataset-add-btn"
                    onClick={() => setIsAdding(true)}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Add Manual Row
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {agent.dataset.map((item, idx) => (
                  <div key={item.id} className="p-4 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-xs transition-all bg-slate-50/30 relative group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-200 text-slate-700 font-mono text-[9px] px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            ID: {item.id}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Input Prompt:</span>
                          <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-100 font-medium">
                            {item.input}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide block">Perfect Target Response:</span>
                          <p className="text-xs text-slate-600 bg-blue-50/10 p-2.5 rounded-lg border border-blue-50/20 font-mono leading-relaxed whitespace-pre-wrap">
                            {item.output}
                          </p>
                        </div>
                      </div>

                      <button
                        id={`delete-example-btn-${item.id}`}
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors self-start opacity-0 group-hover:opacity-100"
                        title="Delete entry"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3: Gemini Synthetic Generator Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Synthetic Data Generator</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Leverage Gemini to autogenerate rich, diverse dataset entries matching your task requirements. Perfect for rapid cold-start training.
            </p>

            <hr className="border-slate-100" />

            {/* Sample sizes */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Dataset Scale</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[3, 5, 10].map(count => (
                  <button
                    key={count}
                    id={`scale-btn-${count}`}
                    type="button"
                    onClick={() => setSyntheticCount(count)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                      syntheticCount === count
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    +{count} rows
                  </button>
                ))}
              </div>
            </div>

            {/* Constraints */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-slate-700">Generator Guidelines</label>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="Instruct Gemini on what specific inputs or styles to focus on." />
              </div>
              <textarea
                id="synthetic-guidelines-textarea"
                value={syntheticGuidelines}
                onChange={(e) => setSyntheticGuidelines(e.target.value)}
                placeholder="e.g. Include negative sentiment cases, lost packages, and inquiries about refund deadlines..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            <button
              id="generate-synthetic-btn"
              onClick={handleGenerateSynthetic}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Generating via Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  Synthesize Training Data
                </>
              )}
            </button>
          </div>

          {/* Prompt Tuning context */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 space-y-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">How This Works</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              When you train/fine-tune the agent, our visual pipeline conducts Meta-Prompt Engineering. It parses this entire dataset, compiles missing instruction boundary rules, extracts custom guidelines, and locks in few-shot prompt alignments.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
