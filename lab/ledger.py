"""점수 기록부 — 실행 한 번 = results/ledger.jsonl 한 줄 (더하기만).
무엇을 바꿨는지(프롬프트 버전 · 골든셋 · 모델)와 점수를 같이 적어야 변경이 개선인지 알 수 있다."""
import json
import os
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "results", "ledger.jsonl")


def append(row: dict):
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    row = {"at": time.strftime("%Y-%m-%d %H:%M:%S"), **row}
    with open(LEDGER, "a") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return row


def from_result(result, goldens_by_input: dict) -> dict:
    """DeepEval `EvaluationResult` → 기록부에 넣을 {metrics: 집계, cases: 건별}."""
    cases, agg = [], {}
    for tr in result.test_results:
        g = goldens_by_input.get(tr.input, {})
        ms = {}
        for md in tr.metrics_data or []:
            ms[md.name] = {"score": md.score, "threshold": md.threshold, "success": bool(md.success), "reason": md.reason, "error": md.error}
            a = agg.setdefault(md.name, {"scores": [], "passed": 0, "total": 0})
            a["total"] += 1
            a["passed"] += 1 if md.success else 0
            if md.score is not None:
                a["scores"].append(md.score)
        cases.append({"id": g.get("id"), "category": g.get("category"), "kind": g.get("kind"), "input": tr.input,
                      "expected_output": tr.expected_output, "actual_output": tr.actual_output,
                      "retrieval_context": tr.retrieval_context, "success": bool(tr.success), "metrics": ms})
    cases.sort(key=lambda c: c["id"] or "")
    metrics = {k: {"avg": round(sum(v["scores"]) / len(v["scores"]), 3) if v["scores"] else None,
                   "passed": v["passed"], "total": v["total"]} for k, v in agg.items()}
    return {"metrics": metrics, "cases": cases,
            "passed_cases": sum(1 for c in cases if c["success"]), "total_cases": len(cases)}
