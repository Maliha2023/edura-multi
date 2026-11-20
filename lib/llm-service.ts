import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { buildFallbackAiResponse } from './llm-fallback';
import {
  getPathwayDisplayName,
  getPromptById,
  type AiExecutionMode,
  type PathwayKey,
  type PromptRole,
} from './prompt-library';

export const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
export const SECONDARY_GEMINI_MODEL = 'gemini-3.1-flash-lite';

export interface LlmGenerateParams {
  role: PromptRole;
  pathway: PathwayKey | string;
  level?: string;
  trackOrDept?: string | null;
  subject?: string;
  mode?: AiExecutionMode | string;
  prompt: string;
  systemInstruction?: string;
  promptId?: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

export interface LlmGenerateResult {
  text: string;
  isFallback: boolean;
  model: string;
  fallbackReason?: 'missing_api_key' | 'rate_limit' | 'auth_error' | 'network_or_api_error' | 'empty_response';
  notice?: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildDefaultSystemInstruction(params: LlmGenerateParams): string {
  const pathwayName = getPathwayDisplayName(params.pathway);
  const levelText = params.level?.trim() || 'Core Level';
  const trackText = params.trackOrDept?.trim() ? ` (${params.trackOrDept.trim()})` : '';
  const subjectText = params.subject?.trim() || 'Core Subject';

  if (params.role === 'teacher') {
    return [
      `You are a curriculum-aware AI Teaching Assistant for ${pathwayName}, supporting a faculty member teaching ${subjectText} at ${levelText}${trackText}.`,
      'Respond with structured, ready-to-use classroom material (clean headings, bullet points, explicit marks or time allocations). Keep output focused and under 450 words.',
    ].join(' ');
  }

  return [
    `You are a curriculum-aware AI Study Tutor for ${pathwayName}, supporting a student in ${levelText}${trackText} studying ${subjectText}.`,
    'Explain clearly step by step with concrete syllabus-aligned examples, accurate terminology, and a brief check-for-understanding tip. Keep output scannable and under 360 words.',
  ].join(' ');
}

function extractStatusCode(err: unknown): number | null {
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status?: unknown }).status === 'number'
  ) {
    return (err as { status: number }).status;
  }
  return null;
}

async function callModel(
  ai: GoogleGenAI,
  model: string,
  fullPrompt: string,
  systemInstruction: string,
  timeoutMs: number
): Promise<string | undefined> {
  const useThinking = model === PRIMARY_GEMINI_MODEL;
  const requestPromise = ai.models
    .generateContent({
      model,
      contents: fullPrompt,
      config: {
        systemInstruction,
        ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      },
    })
    .then((response) => response.text?.trim());

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Generates an AI response using Google Gemini (gemini-4-hydrogen primary with
 * gemini-3.1-flash-lite live fallback on transient demand spikes) reading
 * process.env.GEMINI_API_KEY. Gracefully falls back to a curriculum-tailored
 * structured demo response if the API key is missing, rate-limited, or unreachable.
 */
export async function generateAiResponse(params: LlmGenerateParams): Promise<LlmGenerateResult> {
  const trimmedPrompt = params.prompt.trim();
  if (!trimmedPrompt) {
    throw new Error('Prompt cannot be empty.');
  }

  const matchedTemplate = params.promptId ? getPromptById(params.promptId) : undefined;
  const baseSystemInstruction =
    params.systemInstruction?.trim() ||
    matchedTemplate?.systemInstruction ||
    buildDefaultSystemInstruction(params);
  const effectiveSystemInstruction = `${baseSystemInstruction} Write mathematical expressions in clear plain text or Unicode symbols (avoid raw LaTeX delimiters like $...$ or \\begin{pmatrix}).`;

  const ai = getGeminiClient();
  if (!ai) {
    return {
      text: buildFallbackAiResponse({
        role: params.role,
        pathway: params.pathway,
        level: params.level,
        trackOrDept: params.trackOrDept,
        subject: params.subject,
        mode: params.mode || matchedTemplate?.recommendedMode,
        prompt: trimmedPrompt,
        reason: 'missing_api_key',
      }),
      isFallback: true,
      model: PRIMARY_GEMINI_MODEL,
      fallbackReason: 'missing_api_key',
      notice: 'GEMINI_API_KEY is not configured; returning tailored demo fallback response.',
    };
  }

  const historyLines = Array.isArray(params.history)
    ? params.history
        .slice(-6)
        .filter((item) => item && typeof item.text === 'string' && item.text.trim())
        .map((item) => {
          const speaker =
            item.role === 'user'
              ? params.role === 'teacher'
                ? 'Teacher'
                : 'Student'
              : params.role === 'teacher'
                ? 'Assistant'
                : 'Tutor';
          return `${speaker}: ${item.text.trim()}`;
        })
    : [];

  const fullPrompt =
    historyLines.length > 0
      ? `Recent conversation context:\n${historyLines.join('\n')}\n\nCurrent request:\n${trimmedPrompt}`
      : trimmedPrompt;

  const modelCandidates: { model: string; timeoutMs: number }[] = [
    { model: PRIMARY_GEMINI_MODEL, timeoutMs: 10000 },
    { model: SECONDARY_GEMINI_MODEL, timeoutMs: 12000 },
  ];
  let lastStatus: number | null = null;

  for (const { model: modelName, timeoutMs } of modelCandidates) {
    try {
      const reply = await callModel(
        ai,
        modelName,
        fullPrompt,
        effectiveSystemInstruction,
        timeoutMs
      );
      if (reply) {
        return {
          text: reply,
          isFallback: false,
          model: modelName,
        };
      }
      lastStatus = null;
    } catch (err: unknown) {
      lastStatus = extractStatusCode(err) ?? 503;
      if (lastStatus === 400 || lastStatus === 403) {
        break;
      }
      // For transient 503/500/504, timeout, or 429 on primary model, proceed to secondary free-tier model
    }
  }

  const fallbackReason: LlmGenerateResult['fallbackReason'] =
    lastStatus === 429
      ? 'rate_limit'
      : lastStatus === 400 || lastStatus === 403
        ? 'auth_error'
        : lastStatus === null
          ? 'empty_response'
          : 'network_or_api_error';

  return {
    text: buildFallbackAiResponse({
      role: params.role,
      pathway: params.pathway,
      level: params.level,
      trackOrDept: params.trackOrDept,
      subject: params.subject,
      mode: params.mode || matchedTemplate?.recommendedMode,
      prompt: trimmedPrompt,
      reason: fallbackReason,
    }),
    isFallback: true,
    model: PRIMARY_GEMINI_MODEL,
    fallbackReason,
    notice:
      lastStatus === 429
        ? 'Gemini rate limit reached; returning tailored demo fallback response.'
        : 'Gemini API unavailable; returning tailored demo fallback response.',
  };
}
