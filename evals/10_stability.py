"""단계 10 — Judge 흔들림 측정. 같은 답을 여러 번 채점해 점수가 얼마나 달라지는지 본다.
답(actual_output)은 기록부에 남은 실행의 것을 그대로 쓰고, 채점만 R번 다시 한다.
사용: .venv/bin/python evals/10_stability.py <기록부 라벨> [R=3]"""
import json
import os
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)
os.environ["LAB_RUN"] = "stability"

from deepeval.test_case import LLMTestCase  # noqa: E402

from lab import ledger  # noqa: E402
from lab.metrics import JUDGE_MODEL, correctness, judge  # noqa: E402

LABEL, R = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 3
rows = [json.loads(x) for x in open(ledger.LEDGER)]
src = [r for r in rows if r.get("label") == LABEL and r.get("kind") == "eval"][-1]
J = judge()
t0 = time.time()


def grade(c):
    m = correctness(J)
    m.measure(LLMTestCase(input=c["input"], actual_output=c["actual_output"], expected_output=c["expected_output"]), _show_indicator=False)
    return m.score


def one(c):
    scores = [grade(c) for _ in range(R)]
    return {"id": c["id"], "input": c["input"], "first": c["metrics"]["Correctness [GEval]"]["score"], "scores": scores,
            "spread": round(max(scores) - min(scores), 3), "flips": len({s >= 0.7 for s in scores}) > 1}


with ThreadPoolExecutor(4) as ex:
    cases = list(ex.map(one, src["cases"]))
spreads = [c["spread"] for c in cases]
row = ledger.append({"label": f"stability-{LABEL}", "kind": "stability", "source": LABEL, "repeats": R, "judge_model": JUDGE_MODEL,
                     "seconds": round(time.time() - t0), "mean_spread": round(statistics.mean(spreads), 3), "max_spread": max(spreads),
                     "flipped": sum(1 for c in cases if c["flips"]), "cases": cases})
print(f"\n[흔들림] {LABEL} 의 답 {len(cases)}건 × {R}번 재채점 · 평균 폭 {row['mean_spread']} · 최대 폭 {row['max_spread']} · 통과/실패가 뒤집힌 건 {row['flipped']}")
for c in cases:
    print(f"  {c['id']}  {c['scores']}  폭 {c['spread']}{'  ← 뒤집힘' if c['flips'] else ''}")
