import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, Zap, Play, RotateCcw } from 'lucide-react';
import { SnippetItem, ToneOption } from '../types/voice';
import { applyPostProcessing, buildSystemInstruction } from '../utils/postProcessor';

interface DictionarySnippetsPanelProps {
  dictionary: string[];
  onUpdateDictionary: (words: string[]) => void;
  snippets: SnippetItem[];
  onUpdateSnippets: (items: SnippetItem[]) => void;
  tone: ToneOption;
  emojiCommands: boolean;
}

export const DictionarySnippetsPanel: React.FC<DictionarySnippetsPanelProps> = ({
  dictionary,
  onUpdateDictionary,
  snippets,
  onUpdateSnippets,
  tone,
  emojiCommands,
}) => {
  const [newWord, setNewWord] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState(() => dictionary.join('\n'));

  const [newTrigger, setNewTrigger] = useState('');
  const [newExpansion, setNewExpansion] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Live Post-Processing Sandbox state
  const [testInput, setTestInput] = useState(
    'um bhai ami kothaflow ar fastapi diye কাজ kortesi নতুন লাইন please mail me at my email thumbs up'
  );

  const liveResult = applyPostProcessing(testInput, {
    dictionary,
    snippets,
    emojiCommands,
    tone,
  });

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWord.trim();
    if (!trimmed) return;
    if (!dictionary.some((w) => w.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...dictionary, trimmed];
      onUpdateDictionary(updated);
      setBulkText(updated.join('\n'));
    }
    setNewWord('');
  };

  const handleRemoveWord = (wordToRemove: string) => {
    const updated = dictionary.filter((w) => w !== wordToRemove);
    onUpdateDictionary(updated);
    setBulkText(updated.join('\n'));
  };

  const handleSaveBulkDictionary = () => {
    const parsed = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const unique = Array.from(new Set(parsed));
    onUpdateDictionary(unique);
    setBulkMode(false);
  };

  const handleAddSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    const triggerClean = newTrigger.trim();
    const expansionClean = newExpansion.trim();
    if (!triggerClean || !expansionClean) return;

    const item: SnippetItem = {
      id: `snip-${Date.now()}`,
      trigger: triggerClean,
      expansion: expansionClean,
      description: newDescription.trim() || undefined,
    };
    onUpdateSnippets([item, ...snippets]);
    setNewTrigger('');
    setNewExpansion('');
    setNewDescription('');
  };

  const handleDeleteSnippet = (id: string) => {
    onUpdateSnippets(snippets.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Column 1: Personal Dictionary (Part 5, 6, 10 Spec) */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Personal Dictionary
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Injected into Gemini prompt & enforced via case-insensitive post-processing.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setBulkText(dictionary.join('\n'));
                setBulkMode(!bulkMode);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {bulkMode ? 'Switch to List View' : 'Bulk Edit (1 per line)'}
            </button>
          </div>

          {bulkMode ? (
            <div className="space-y-3">
              <label
                htmlFor="bulk-dictionary-textarea"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Personal Dictionary Words (one word or brand term per line)
              </label>
              <textarea
                id="bulk-dictionary-textarea"
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="KothaFlow&#10;Dhaka&#10;FastAPI"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkMode(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkDictionary}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Save Dictionary ({bulkText.split('\n').filter((x) => x.trim()).length} terms)
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleAddWord} className="flex items-center gap-2 mb-4">
                <label htmlFor="new-dict-word" className="sr-only">
                  Add dictionary word
                </label>
                <input
                  id="new-dict-word"
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="Add name, technical term, or brand (e.g., Antigravity, Sylhet)..."
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Word
                </button>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                {dictionary.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500 text-center">
                    No custom terms yet. Add names or technical spellings above.
                  </p>
                ) : (
                  dictionary.map((word) => (
                    <div
                      key={word}
                      className="flex items-center justify-between px-3.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="font-mono text-slate-800 dark:text-slate-200">{word}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWord(word)}
                        aria-label={`Remove dictionary word ${word}`}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        {/* Column 2: Voice Snippets / Shortcuts (Part 1, 9, 10 Spec) */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Voice Snippets & Shortcuts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Speak a trigger phrase (e.g. &ldquo;my email&rdquo;) to automatically expand text without extra API tokens.
            </p>
          </div>

          <form onSubmit={handleAddSnippet} className="space-y-3 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="snippet-trigger"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Spoken Trigger
                </label>
                <input
                  id="snippet-trigger"
                  type="text"
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  placeholder="e.g. my address"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label
                  htmlFor="snippet-expansion"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Expanded Text
                </label>
                <input
                  id="snippet-expansion"
                  type="text"
                  value={newExpansion}
                  onChange={(e) => setNewExpansion(e.target.value)}
                  placeholder="e.g. Banani, Road 11, Dhaka"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Snippet
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg max-h-64 overflow-y-auto">
            {snippets.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-xs text-blue-700 dark:text-blue-400">
                      &ldquo;{item.trigger}&rdquo;
                    </span>
                    <span className="text-slate-400" aria-hidden="true">
                      →
                    </span>
                    <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
                      {item.expansion}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSnippet(item.id)}
                  aria-label={`Delete snippet ${item.trigger}`}
                  className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Row: Live Post-Processing & System Prompt Inspector (Part 5 & Part 10 Spec) */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Post-Processing Pipeline Tester (Part 10 Spec)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test how raw speech with fillers (&ldquo;um&rdquo;, &ldquo;আআ&rdquo;), lowercase dictionary words, and snippet triggers transforms in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setTestInput(
                'um bhai ami kothaflow ar fastapi diye কাজ kortesi নতুন লাইন please mail me at my email thumbs up'
              )
            }
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Sample Input
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="postprocess-test-input"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Simulated Raw Speech Input
            </label>
            <textarea
              id="postprocess-test-input"
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              <span>Post-Processed Output (Ready for Cursor Insert)</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Snippets: {liveResult.appliedSnippets.length} · Dict Matches:{' '}
                {liveResult.appliedDictionary.length}
              </span>
            </div>
            <div className="w-full min-h-[84px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
              {liveResult.text || (
                <span className="text-slate-400 italic">
                  {liveResult.command
                    ? `[Executes Voice Command: ${liveResult.command}]`
                    : 'Empty output'}
                </span>
              )}
            </div>
          </div>
        </div>

        <details className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <summary className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
            Inspect Live Gemini System Instruction (Part 5 Prompt with injected Dictionary & Tone)
          </summary>
          <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
            {buildSystemInstruction(dictionary, tone, 'auto')}
          </pre>
        </details>
      </section>
    </div>
  );
};
