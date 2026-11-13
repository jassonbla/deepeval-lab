interface MetricResult {
  score: number | null
  threshold: number | null
  success: boolean
  reason: string | null
  error: string | null
}

interface EvalCase {
  id: string
  category?: string
  kind?: string
  input: string
  expected_output: string
  actual_output: string
  retrieval_context: string[] | null
  success: boolean
  metrics: Record<string, MetricResult>
}

interface MetricSummary {
  avg: number | null
  passed: number
  total: number
}

interface EvalRun {
  kind: "eval"
  at: string
  label: string
  note: string
  prompt_version: string
  goldens: string
  seconds: number
  metrics: Record<string, MetricSummary>
  cases: EvalCase[]
  passed_cases: number
  total_cases: number
}

interface SpanScore {
  metric: string | null
  score: number | null
  success: boolean
  reason: string | null
}

interface ComponentRun {
  kind: "component"
  at: string
  label: string
  prompt_version: string
  cases: {
    id: string
    input: string
    retrieved: string[]
    actual_output: string | null
    retriever: SpanScore
    llm: SpanScore
  }[]
}

interface StabilityRun {
  kind: "stability"
  at: string
  label: string
  source: string
  repeats: number
  mean_spread: number
  max_spread: number
  flipped: number
  cases: {
    id: string
    input: string
    first: number
    scores: number[]
    spread: number
    flips: boolean
  }[]
}

interface OtherRow {
  kind: "synth"
  at: string
  label: string
}

type LedgerRow = EvalRun | ComponentRun | StabilityRun | OtherRow

interface Golden {
  id: string
  input: string
  expected_output: string
  category?: string
  kind?: string
  origin?: string
  accepted?: boolean
  review_note?: string
}

interface CallStats {
  count: number
  seconds: number
  api_price_usd: number
}

interface PromptVersion {
  top_k: number
  rewrite: boolean
  text: string
}

interface LabData {
  ledger: LedgerRow[]
  goldens: Record<string, Golden[]>
  calls: Record<string, CallStats>
  prompts: Record<string, PromptVersion>
  app_model: string
  exported_at?: string
}

interface AskResult {
  output: string
  retrieval_context: string[]
}

const CORRECTNESS = "Correctness [GEval]"

const evalRuns = (data: LabData) =>
  data.ledger.filter((row): row is EvalRun => row.kind === "eval")

const fmt = (value: number | null | undefined) =>
  value == null ? "–" : value.toFixed(2)

const STATIC = import.meta.env.MODE === "static"

async function loadData(): Promise<LabData> {
  const response = await fetch(STATIC ? "data.json" : "api/data")
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function ask(question: string, prompt: string): Promise<AskResult> {
  const response = await fetch("api/ask", {
    method: "POST",
    body: JSON.stringify({ question, prompt }),
  })
  const body = await response.json()
  if (body.error) throw new Error(body.error)
  return body
}

export { ask, CORRECTNESS, evalRuns, fmt, loadData, STATIC }
export type {
  AskResult,
  ComponentRun,
  EvalCase,
  EvalRun,
  Golden,
  LabData,
  MetricResult,
  SpanScore,
  StabilityRun,
}
