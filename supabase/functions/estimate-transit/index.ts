import { corsHeaders, json, preflight } from '../_shared/cors.ts';
import { callClaude, extractJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  try {
    const { area, fromSpot, toSpot, mode } = (await req.json()) as {
      area: string;
      fromSpot: string;
      toSpot: string;
      mode: string;
    };
    if (!fromSpot || !toSpot || !mode) {
      return json({ error: '出発地・目的地・移動手段が必要です' }, 400);
    }

    const system = [
      'あなたは日本国内の移動時間を概算するアシスタントです。',
      '与えられた2地点の間を、指定の交通手段を主体に移動した場合の「ドアtoドア」の所要時間の目安を答えます。',
      '- 地点が住所・自宅・町名などの場合は、最寄り駅／バス停までの徒歩、待ち時間、乗換、目的地までの徒歩を含めて現実的に見積もる。',
      '- 「電車」でも駅が遠い区間の端は徒歩・バスを含めてよい。市をまたぐ移動は特急・新快速など一般的な経路を想定。',
      'リアルタイムの渋滞や正確な時刻表は考慮しない概算でよい。',
      '出力は有効な JSON のみ（説明文・コードフェンス禁止）。形式:',
      '{ "duration": "約NN分" または "約N時間NN分",',
      '  "note": "経路の簡単な補足（40字以内。例: 阿倍野→天王寺→JRで京都→市バス。乗換2回)",',
      '  "confidence": "high" | "medium" | "low" }',
      '地点を特定できない場合も一般的な想定で概算し、confidence を low にする。',
    ].join('\n');

    const user = [
      area ? `エリア: ${area}` : '',
      `出発地: ${fromSpot}`,
      `目的地: ${toSpot}`,
      `移動手段: ${mode}`,
      '',
      'JSON のみを出力してください。',
    ]
      .filter(Boolean)
      .join('\n');

    const text = await callClaude({ system, user, maxTokens: 300 });
    const parsed = extractJson<{ duration?: string; note?: string; confidence?: string }>(text);

    const duration = String(parsed.duration ?? '').trim();
    if (!duration) return json({ error: '所要時間を推定できませんでした' }, 502);

    return json({
      duration,
      note: String(parsed.note ?? '').trim(),
      confidence: parsed.confidence ?? 'low',
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
