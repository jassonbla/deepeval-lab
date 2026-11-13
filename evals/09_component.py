"""단계 9 — 컴포넌트 평가. 봇 전체가 아니라 검색기 · 답변기를 따로 채점해 「어디서 틀렸나」 를 본다.
앱의 @observe span 에 메트릭을 붙이고 `dataset.evals_iterator()` 로 골든을 하나씩 돌린다.
  검색기 span → ContextualRelevancy (가져온 조각이 질문과 관련 있나)
  답변기 span → Faithfulness (답이 가져온 조각에 근거하나)
사용: .venv/bin/python evals/09_component.py <라벨> [--prompt v1] [--goldens v0] [--only g04,g09]"""
import argparse
import glob
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

p = argparse.ArgumentParser()
p.add_argument("label")
p.add_argument("--prompt", default="v1")
p.add_argument("--goldens", default="v0")
p.add_argument("--only", default="")
args = p.parse_args()
os.environ["LAB_RUN"] = args.label

from deepeval.dataset import EvaluationDataset, Golden  # noqa: E402
from deepeval.evaluate.configs import AsyncConfig, DisplayConfig  # noqa: E402
from deepeval.metrics import ContextualRelevancyMetric, FaithfulnessMetric  # noqa: E402

from app import bot, retriever  # noqa: E402
from lab import ledger  # noqa: E402
from lab.metrics import JUDGE_MODEL, judge  # noqa: E402

J = judge()
retriever.SPAN_METRICS["retriever"] = lambda: [ContextualRelevancyMetric(threshold=0.5, model=J)]
retriever.SPAN_METRICS["llm"] = lambda: [FaithfulnessMetric(threshold=0.7, model=J)]

goldens = json.load(open(f"goldens/{args.goldens}.json"))
if args.only:
    goldens = [g for g in goldens if g["id"] in args.only.split(",")]
dataset = EvaluationDataset(goldens=[Golden(input=g["input"], expected_output=g["expected_output"]) for g in goldens])

t0 = time.time()
before = set(glob.glob("results/runs/test_run_*.json"))
for golden in dataset.evals_iterator(async_config=AsyncConfig(run_async=False),
                                     display_config=DisplayConfig(print_results=False, inspect_after_run=False, results_folder="results/runs")):
    bot.answer(golden.input, args.prompt)

# DeepEval 이 저장한 test_run JSON 에서 span 별 점수를 꺼내 기록부에 남긴다
new = sorted(set(glob.glob("results/runs/test_run_*.json")) - before)
run = json.load(open(new[-1]))
by_input = {g["input"]: g for g in goldens}


def span_score(spans):
    md = ((spans or [{}])[0].get("metricsData") or [{}])[0]
    return {"metric": md.get("name"), "score": md.get("score"), "success": bool(md.get("success")), "reason": md.get("reason")}


cases = []
for tc in run["testCases"]:
    g, tr = by_input.get(tc["input"], {}), tc["trace"]
    r = (tr.get("retrieverSpans") or [{}])[0]
    gen = [s for s in tr.get("llmSpans") or [] if s.get("name") == "generate"]  # v3 은 llm span 이 둘이다 (rewrite_query · generate)
    l = (gen or [{}])[0]
    cases.append({"id": g.get("id"), "input": tc["input"], "retrieved": [d.splitlines()[0] for d in r.get("retrievalContext") or []],
                  "actual_output": l.get("output"), "retriever": span_score(tr.get("retrieverSpans")), "llm": span_score(gen)})
cases.sort(key=lambda c: c["id"] or "")
row = ledger.append({"label": args.label, "kind": "component", "prompt_version": args.prompt, "goldens": args.goldens,
                     "judge_model": JUDGE_MODEL, "seconds": round(time.time() - t0), "file": new[-1], "cases": cases})
print(f"\n[{args.label}] 컴포넌트 평가 · 프롬프트 {args.prompt} · {len(cases)}건 · {row['seconds']}초")
for c in cases:
    mark = lambda s: f"{'✓' if s['success'] else '✗'} {s['score']}"
    print(f"  {c['id']}  검색기 {mark(c['retriever'])}   답변기 {mark(c['llm'])}   {c['input'][:28]}")
