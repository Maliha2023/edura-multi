import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PATHWAY_KEYS,
  getPromptsForContext,
  interpolatePrompt,
  PROMPT_LIBRARY,
} from './prompt-library';
import { generateAiResponse } from './llm-service';

test('PROMPT_LIBRARY contains at least 24 curated prompts covering all 6 pathways and both roles', () => {
  assert.ok(PROMPT_LIBRARY.length >= 24, `Expected >= 24 prompts, got ${PROMPT_LIBRARY.length}`);

  const ids = new Set(PROMPT_LIBRARY.map((p) => p.id));
  assert.equal(ids.size, PROMPT_LIBRARY.length, 'Prompt IDs must be unique');

  for (const pathway of ALL_PATHWAY_KEYS) {
    const studentPrompts = getPromptsForContext({ role: 'student', pathway });
    const teacherPrompts = getPromptsForContext({ role: 'teacher', pathway });

    assert.ok(
      studentPrompts.length >= 3,
      `Expected >= 3 student prompts for ${pathway}, got ${studentPrompts.length}`
    );
    assert.ok(
      teacherPrompts.length >= 3,
      `Expected >= 3 teacher prompts for ${pathway}, got ${teacherPrompts.length}`
    );

    // Pathway-specific prompts should appear before universal ('all') prompts
    const firstUniversalIdx = studentPrompts.findIndex((p) => p.pathways === 'all');
    if (firstUniversalIdx !== -1) {
      const hasSpecificAfterUniversal = studentPrompts
        .slice(firstUniversalIdx + 1)
        .some((p) => p.pathways !== 'all');
      assert.equal(
        hasSpecificAfterUniversal,
        false,
        `Pathway-specific prompts should sort ahead of universal prompts for ${pathway}`
      );
    }
  }
});

test('interpolatePrompt resolves all dynamic curriculum placeholders cleanly', () => {
  for (const item of PROMPT_LIBRARY) {
    const output = interpolatePrompt(item.userTemplate, {
      pathway: 'qawmi',
      level: 'Mutawassitah',
      trackOrDept: 'General / Kitab',
      subject: 'Hidayatun Nahw',
      topic: 'Mubtada and Khabar',
    });

    assert.equal(
      /\{\{.*?\}\}/.test(output),
      false,
      `Unresolved placeholder found in ${item.id}: ${output}`
    );
    assert.ok(output.includes('Qawmi Madrasa'));
    assert.ok(output.includes('Mutawassitah'));
    assert.ok(output.includes('Hidayatun Nahw'));
    assert.ok(output.includes('Mubtada and Khabar'));
  }
});

test('generateAiResponse returns tailored safe fallback when GEMINI_API_KEY is missing', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const res = await generateAiResponse({
      role: 'student',
      pathway: 'cambridge',
      level: 'O Level / IGCSE (Grades 9–10)',
      trackOrDept: 'Science',
      subject: 'Physics (5054)',
      mode: 'practice',
      prompt: 'Give me practice questions on "Electromagnetic Induction".',
    });

    assert.equal(res.isFallback, true);
    assert.equal(res.fallbackReason, 'missing_api_key');
    assert.ok(res.text.includes('Cambridge International'));
    assert.ok(res.text.includes('Physics (5054)'));
    assert.ok(res.text.includes('Electromagnetic Induction'));
  } finally {
    if (prevKey !== undefined) {
      process.env.GEMINI_API_KEY = prevKey;
    }
  }
});
