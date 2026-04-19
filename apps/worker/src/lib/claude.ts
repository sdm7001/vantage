import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@vantage/config';

let _client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY });
  return _client;
}

export const MODELS = {
  HAIKU: 'claude-haiku-4-5-20251001',
  SONNET: 'claude-sonnet-4-6',
} as const;

export type ClaudeModel = (typeof MODELS)[keyof typeof MODELS];

export async function callClaude(opts: {
  model: ClaudeModel;
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string | Anthropic.MessageParam['content'] }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const client = getClaude();
  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.3,
    system: opts.system,
    messages: opts.messages as Anthropic.MessageParam[],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Claude response type: ' + block.type);
  return block.text;
}

export async function callClaudeJSON<T>(opts: Parameters<typeof callClaude>[0]): Promise<T> {
  const raw = await callClaude(opts);
  // Strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
