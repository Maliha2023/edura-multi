import { buildFallbackAiResponse } from '../../lib/llm-fallback';
import type { AiExecutionMode, PathwayKey, PromptRole } from '../../lib/prompt-library';

export interface AiRequestOptions {
  endpoint: string;
  role: PromptRole;
  pathway: PathwayKey | string;
  level: string;
  trackOrDept?: string | null;
  subject: string;
  mode: AiExecutionMode | string;
  prompt: string;
  promptId?: string;
  payload: Record<string, unknown>;
}

export interface AiClientResponse {
  reply: string;
  isFallback: boolean;
  notice?: string;
}

/**
 * Sends an AI request to the backend pathway-scoped API endpoint (which invokes
 * lib/llm-service.ts on the server). Falls back gracefully to a structured
 * curriculum-aware demo response if the endpoint is unreachable.
 */
export async function requestCurriculumAi(options: AiRequestOptions): Promise<AiClientResponse> {
  try {
    const response = await fetch(options.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...options.payload,
        promptId: options.promptId,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      reply?: string;
      isFallback?: boolean;
      notice?: string;
      error?: string;
    };

    if (response.ok && data.reply) {
      return {
        reply: data.reply,
        isFallback: Boolean(data.isFallback),
        notice: data.notice,
      };
    }

    // If the server returned 400 (empty prompt), bubble or fallback safely
    return {
      reply: buildFallbackAiResponse({
        role: options.role,
        pathway: options.pathway,
        level: options.level,
        trackOrDept: options.trackOrDept,
        subject: options.subject,
        mode: options.mode,
        prompt: options.prompt,
        reason: 'network_or_api_error',
      }),
      isFallback: true,
      notice: data.error || 'Using curriculum demo fallback response.',
    };
  } catch {
    return {
      reply: buildFallbackAiResponse({
        role: options.role,
        pathway: options.pathway,
        level: options.level,
        trackOrDept: options.trackOrDept,
        subject: options.subject,
        mode: options.mode,
        prompt: options.prompt,
        reason: 'network_or_api_error',
      }),
      isFallback: true,
      notice: 'Offline/network fallback active.',
    };
  }
}
