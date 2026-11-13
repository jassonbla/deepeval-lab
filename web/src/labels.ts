// The lab data (results/ledger.jsonl, goldens/*.json) was written in Korean.
// These maps give its short labels an English display form; the files stay as they are.

const KINDS: Record<string, string> = {
  단순: "Simple",
  계산: "Calculation",
  조건: "Condition",
  예외: "Exception",
  "문서에 없음": "Not in docs",
  "다른 표현": "Paraphrase",
  합성: "Synthetic",
}

const ORIGINS: Record<string, string> = {
  "직접 작성": "Hand-written",
  "실패 사례에서 추가": "Added from failures",
  "문서에서 합성 · Claude 검수": "Synthesized from docs · reviewed by Claude",
}

const RUN_NOTES: Record<string, string> = {
  baseline: "Baseline: a plain prompt",
  regression: "Deliberately bad: always agree, docs are reference only, 1 chunk",
  fix: "Fixed after the baseline failures: docs only, do the math, state exceptions, defer to support, 3 chunks",
  "fix-on-v1": "Golden set grown from 10 to 21 (5 from failures, 6 synthetic)",
  "retriever-fix": "Added a step that rewrites the query into policy terms (answer prompt unchanged from v2)",
}

const REVIEW_NOTES: Record<string, string> = {
  s01: "Matches the docs",
  s02: "Expected output says exchanges are not covered, but the exchange policy has a defect clause. The synthesizer saw one document only",
  s03: "Matches the docs (20% of 200,000 = 40,000, valid for 1 year)",
  s04: "Matches the docs (birthday coupon is Gold only)",
  s05: "Expected output guesses at something the policy does not say (quality score 0.4)",
  s06: "Expected output guesses at something the policy does not say",
  s07: "Expected output mixes in speculation",
  s08: "Matches the docs",
  s09: "Matches the docs (Jeju surcharge applies to free shipping too)",
  s10: "Matches the docs (Friday 3 pm ships Monday)",
}

const kindLabel = (kind?: string) => (kind ? (KINDS[kind] ?? kind) : "")
const originLabel = (origin?: string) => (origin ? (ORIGINS[origin] ?? origin) : "")
const runNote = (label: string, note: string) => RUN_NOTES[label] ?? note
const reviewNote = (id: string, note?: string) => REVIEW_NOTES[id] ?? note ?? ""

export { kindLabel, originLabel, reviewNote, runNote }
