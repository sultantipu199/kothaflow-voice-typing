import React, { useState } from 'react';
import { Copy, Check, Trash2, Search, CornerDownLeft, Clock } from 'lucide-react';
import { DetectedLanguage, HistoryItem } from '../types/voice';

interface HistoryPanelProps {
  history: HistoryItem[];
  onDeleteHistoryItem: (id: string) => void;
  onClearAllHistory: () => void;
  onInsertFromHistory: (text: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onDeleteHistoryItem,
  onClearAllHistory,
  onInsertFromHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [langFilter, setLangFilter] = useState<'all' | DetectedLanguage>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHistory = history.filter((item) => {
    const matchesLang = langFilter === 'all' || item.language === langFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.cleanedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rawText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLang && matchesSearch;
  });

  const handleCopy = async (item: HistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.cleanedText);
    } catch {
      // Fallback if clipboard blocked in headless iframe
    }
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Transcription History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              Showing {filteredHistory.length} of {history.length} saved dictations (maximum 50 retained locally)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['all', 'bn', 'en', 'banglish', 'mixed'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLangFilter(lang)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    langFilter === lang
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {lang === 'all'
                    ? 'All'
                    : lang === 'bn'
                      ? 'বাংলা'
                      : lang === 'en'
                        ? 'English'
                        : lang === 'banglish'
                          ? 'Banglish'
                          : 'Mixed'}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearAllHistory}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-5">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcriptions by Bangla, English, or Banglish keywords..."
            aria-label="Search transcription history"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* History Items List */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No transcriptions match your filter
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Record with the microphone or click a Sample Voice Clip in the Studio tab to populate history.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Unboxed clean metadata with typographic separators */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.language === 'bn'
                        ? 'বাংলা (Bangla)'
                        : item.language === 'en'
                          ? 'English'
                          : item.language === 'banglish'
                            ? 'Banglish'
                            : 'Mixed Code-Switch'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Tone: {item.tone}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.wordCount} words</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.durationSec.toFixed(1)}s clip</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.timestamp}</span>
                  </div>

                  <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {item.cleanedText}
                  </p>

                  {item.rawText && item.rawText !== item.cleanedText && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      Raw speech: &ldquo;{item.rawText}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onInsertFromHistory(item.cleanedText)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    Insert at Cursor
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(item)}
                    aria-label={`Copy transcription from ${item.timestamp}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteHistoryItem(item.id)}
                    aria-label={`Delete transcription from ${item.timestamp}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
