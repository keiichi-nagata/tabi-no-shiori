// Anthropic Messages API 呼び出しと JSON 抽出

const API_URL = 'https://api.anthropic.com/v1/messages';

export async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が未設定です');
  const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5';

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic API エラー (${res.status}): ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  const text: string = (data.content ?? [])
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text: string }) => c.text)
    .join('\n');
  return text;
}

/** モデル出力から最初の JSON 値を取り出してパースする */
export function extractJson<T>(text: string): T {
  let s = text.trim();
  // ```json ... ``` フェンスを除去
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
  if (fence) s = fence[1].trim();
  // 先頭の { か [ から末尾の対応する括弧まで
  const start = s.search(/[[{]/);
  if (start > 0) s = s.slice(start);
  const lastObj = s.lastIndexOf('}');
  const lastArr = s.lastIndexOf(']');
  const end = Math.max(lastObj, lastArr);
  if (end >= 0) s = s.slice(0, end + 1);
  return JSON.parse(s) as T;
}
