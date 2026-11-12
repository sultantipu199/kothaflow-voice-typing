import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPostProcessing,
  buildSystemInstruction,
  detectLanguageFromText,
  insertTextAtCursor,
} from './postProcessor';

test('buildSystemInstruction injects dictionary list and tone cleanly', () => {
  const prompt = buildSystemInstruction(['KothaFlow', 'Dhaka', 'Next.js'], 'email', 'auto');
  assert.ok(prompt.includes('KothaFlow, Dhaka, Next.js'));
  assert.ok(prompt.includes('Tone: email'));
  assert.ok(prompt.includes('"language": "bn | en | banglish | mixed"'));
});

test('applyPostProcessing removes filler words and expands snippets without altering email casing', () => {
  const result = applyPostProcessing(
    'um hello ভাই আআ please send the report to my email full stop',
    {
      dictionary: ['KothaFlow', 'Tipu'],
      snippets: [
        { id: '1', trigger: 'my email', expansion: 'tipu@example.com' },
      ],
      emojiCommands: true,
      tone: 'email',
    }
  );

  assert.equal(result.text, 'Hello ভাই please send the report to tipu@example.com.');
  assert.deepEqual(result.appliedSnippets, ['my email']);
  assert.ok(result.removedFillers.length > 0);
});

test('applyPostProcessing enforces personal dictionary case-insensitively', () => {
  const result = applyPostProcessing(
    'ami kothaflow ar fastapI diye ekta project banacchi নতুন লাইন dhaka theke',
    {
      dictionary: ['KothaFlow', 'FastAPI', 'Dhaka'],
      snippets: [],
      emojiCommands: false,
      tone: 'casual',
    }
  );

  assert.equal(result.text, 'Ami KothaFlow ar FastAPI diye ekta project banacchi\nDhaka theke');
  assert.ok(result.appliedDictionary.includes('KothaFlow'));
  assert.ok(result.appliedDictionary.includes('FastAPI'));
  assert.ok(result.appliedDictionary.includes('Dhaka'));
});

test('applyPostProcessing handles delete command accurately', () => {
  const result = applyPostProcessing('delete last sentence', {
    dictionary: [],
    snippets: [],
  });
  assert.equal(result.command, 'delete');
  assert.equal(result.text, '');
});

test('insertTextAtCursor inserts text with smart spacing and handles delete command', () => {
  const initial = 'Hello team. We are launching tomorrow.';
  const inserted = insertTextAtCursor(
    initial,
    initial.length,
    initial.length,
    'Please review the APK build.',
    null
  );
  assert.equal(
    inserted.content,
    'Hello team. We are launching tomorrow. Please review the APK build.'
  );

  const afterDelete = insertTextAtCursor(
    inserted.content,
    inserted.content.length,
    inserted.content.length,
    '',
    'delete'
  );
  assert.equal(afterDelete.content, 'Hello team. We are launching tomorrow.');
});

test('detectLanguageFromText distinguishes bn, en, banglish, and mixed', () => {
  assert.equal(detectLanguageFromText('আমি বাংলায় কথা বলি।'), 'bn');
  assert.equal(detectLanguageFromText('Ami ajke office jabo na bhai.'), 'banglish');
  assert.equal(detectLanguageFromText('আমি আজকে GitHub push করেছি।'), 'mixed');
  assert.equal(detectLanguageFromText('The deployment finished cleanly.'), 'en');
});

test('applyPostProcessing cleans Bangla fillers and converts both দাড়ি and দাঁড়ি to ।', () => {
  const result = applyPostProcessing(
    'আআ আজকে বিকেলে এই যে আমাদের KothaFlow প্রজেক্টের নতুন আপডেট রিলিজ হবে দাড়ি সবাই একটু চেক করে জানাবেন দাঁড়ি',
    {
      dictionary: ['KothaFlow'],
      snippets: [],
      tone: 'natural',
    }
  );
  assert.equal(
    result.text,
    'আজকে বিকেলে আমাদের KothaFlow প্রজেক্টের নতুন আপডেট রিলিজ হবে। সবাই একটু চেক করে জানাবেন।'
  );
});
