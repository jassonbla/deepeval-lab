"""골든셋을 봇에 돌리고 채점해 기록부에 한 줄 남긴다 (단계 5 · 7 · 8 공용).
사용: .venv/bin/python evals/run_eval.py <라벨> [--prompt v1] [--goldens v0] [--note "무엇을 바꿨나"]
결과: results/ledger.jsonl (한 줄) · results/runs/test_run_<시각>.json (DeepEval 원본)"""
import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

p = argparse.ArgumentParser()
p.add_argument("label")
p.add_argument("--prompt", default="v1")
p.add_argument("--goldens", default="v0")
p.add_argument("--note", default="")
args = p.parse_args()
os.environ["LAB_RUN"] = args.label  # 호출 기록(results/calls.jsonl)에 실행 이름을 남긴다

from deepeval import evaluate  # noqa: E402
from deepeval.evaluate.configs import AsyncConfig, DisplayConfig  # noqa: E402
from deepeval.test_case import LLMTestCase  # noqa: E402

from app import bot  # noqa: E402
from lab import ledger  # noqa: E402
from lab.metrics import JUDGE_MODEL, all_metrics  # noqa: E402

goldens = json.load(open(f"goldens/{args.goldens}.json"))
t0 = time.time()

# 1) 골든의 input 을 봇에 넣어 actual_output 을 만든다 — 골든 + 실제 출력 = 테스트 케이스
with ThreadPoolExecutor(4) as ex:
    outs = list(ex.map(lambda g: bot.answer(g["input"], args.prompt), goldens))
cases = [LLMTestCase(input=g["input"], actual_output=o["output"], expected_output=g["expected_output"],
                     retrieval_context=o["retrieval_context"]) for g, o in zip(goldens, outs)]

# 2) 채점
hyper = {"prompt_version": args.prompt, "goldens": args.goldens, "app_model": bot.APP_MODEL, "judge_model": JUDGE_MODEL,
         "top_k": bot.PROMPTS[args.prompt]["top_k"]}
result = evaluate(test_cases=cases, metrics=all_metrics(), hyperparameters=hyper,
                  async_config=AsyncConfig(max_concurrent=4),
                  display_config=DisplayConfig(print_results=False, inspect_after_run=False, results_folder="results/runs"))

# 3) 기록부
row = ledger.append({"label": args.label, "note": args.note, "kind": "eval", **hyper, "seconds": round(time.time() - t0),
                     **ledger.from_result(result, {g["input"]: g for g in goldens})})
print(f"\n[{args.label}] 프롬프트 {args.prompt} · 골든 {args.goldens} · {row['passed_cases']}/{row['total_cases']}건 통과 · {row['seconds']}초")
for name, m in row["metrics"].items():
    print(f"  {name:24s} 평균 {m['avg']}  통과 {m['passed']}/{m['total']}")
for c in row["cases"]:
    if not c["success"]:
        bad = [f"{k} {v['score']}" for k, v in c["metrics"].items() if not v["success"]]
        print(f"  ✗ {c['id']} {c['input'][:30]} — {', '.join(bad)}")
