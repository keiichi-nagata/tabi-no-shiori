#!/usr/bin/env bash
# Supabase Edge Functions をまとめてデプロイする。
# 事前に: npm i -g supabase && supabase login && supabase link --project-ref <ref>
#         supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
set -euo pipefail

FUNCS=(
  generate-plans
  estimate-transit
  format-itinerary
  create-itinerary
  reset-pin
  get-shared
  update-shared
)

for f in "${FUNCS[@]}"; do
  echo "── deploy: $f"
  supabase functions deploy "$f"
done

echo "✓ done (${#FUNCS[@]} functions)"
