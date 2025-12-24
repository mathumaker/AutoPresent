import React, { useEffect, useState } from 'react';
import { Settings, Clipboard, FileText } from 'lucide-react';

interface ScriptPanelProps {
  heightPercent: number;
  scriptContent: string;
  setScriptContent: (s: string) => void;
  isRecording: boolean;
  scriptContainerRef: React.RefObject<HTMLDivElement>;
  fontSize?: number;
}

export const ScriptPanel: React.FC<ScriptPanelProps> = ({
  heightPercent,
  scriptContent,
  setScriptContent,
  isRecording,
  scriptContainerRef,
  fontSize = 32
}) => {
  const [parsedScript, setParsedScript] = useState<string[]>([]);

  // Parse markdown speech blocks
  useEffect(() => {
    const speechRegex = /```speech([\s\S]*?)```/g;
    let match;
    const segments: string[] = [];
    
    // If no blocks found, use raw text if it doesn't look like code, or just hint
    let found = false;
    while ((match = speechRegex.exec(scriptContent)) !== null) {
      found = true;
      if (match[1]) {
        segments.push(match[1].trim());
      }
    }

    if (!found && scriptContent.trim().length > 0) {
      // Fallback: treat whole text as speech if no blocks
      setParsedScript([scriptContent]);
    } else {
      setParsedScript(segments);
    }
  }, [scriptContent]);

  return (
    <div 
      className="w-full bg-studio-panel border-b border-gray-700 flex flex-col transition-all duration-300 relative z-20 shadow-lg"
      style={{ height: `${heightPercent}%` }}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 h-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <FileText size={14} /> Teleprompter
        </h2>
        {!isRecording && (
            <span className="text-[10px] text-gray-500">Paste Markdown with ```speech``` blocks</span>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Mode (when not recording) */}
        {!isRecording ? (
          <textarea
            className="w-full h-full bg-transparent p-4 resize-none outline-none text-gray-300 font-mono text-sm leading-relaxed"
            placeholder="Paste your script here...\n\nExample:\n# Slide 1\n```speech\nHello and welcome to this presentation.\n```"
            value={scriptContent}
            onChange={(e) => setScriptContent(e.target.value)}
          />
        ) : (
          /* Prompter Mode (when recording) */
          <div 
            ref={scriptContainerRef}
            className="w-full h-full overflow-y-auto p-8 font-bold leading-relaxed text-white script-scroll scroll-smooth"
            style={{ fontSize: `${fontSize}px` }}
          >
            <div className="max-w-4xl mx-auto space-y-12 pb-[50vh]">
              {parsedScript.length > 0 ? parsedScript.map((segment, i) => (
                <div key={i}>
                  <p>{segment}</p>
                  {i < parsedScript.length - 1 && (
                    <div className="py-8 flex items-center justify-center opacity-50">
                      <span className="text-sm font-mono text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full">--- NEXT SLIDE ---</span>
                    </div>
                  )}
                </div>
              )) : (
                 <p className="opacity-50 italic" style={{ fontSize: '1rem' }}>No speech blocks found. Please add content inside ```speech``` blocks.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};