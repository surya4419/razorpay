import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Code2 } from 'lucide-react';

export function PayloadViewer({ title = 'Raw Razorpay Payload', payload, defaultExpanded = false }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!payload) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-[#6B7280] font-mono italic">
        No payload data available for this stage.
      </div>
    );
  }

  const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-[#111827] font-medium">
          <Code2 className="w-3.5 h-3.5 text-[#528FF0]" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#111827] bg-white hover:bg-gray-50 px-2 py-0.5 rounded border border-gray-200 transition"
            title="Copy JSON"
          >
            {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#6B7280] hover:text-[#111827] p-0.5"
            aria-label={expanded ? 'Collapse payload' : 'Expand payload'}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 bg-gray-50 max-h-64 overflow-y-auto overflow-x-auto text-[#111827] leading-relaxed border-t border-gray-200/50">
          <pre className="text-[11px] font-mono text-[#528FF0] whitespace-pre selection:bg-[#528FF0]/10">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}




