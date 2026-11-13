"""단계 8 — 정책 문서에서 골든을 합성한다 (DeepEval Synthesizer).
`generate_goldens_from_contexts` 는 문맥을 직접 넘기므로 임베딩 모델이 필요 없다.
합성 결과는 검수 전 원본으로만 저장한다 — 틀린 expected_output 은 이후 모든 점수를 왜곡한다.
사용: .venv/bin/python evals/08_synthesize.py   → goldens/synth_raw.json"""
import json
import os
import sys
import time
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)
os.environ["LAB_RUN"] = "synthesize"

from deepeval.synthesizer import Synthesizer  # noqa: E402
from deepeval.synthesizer.config import EvolutionConfig, StylingConfig  # noqa: E402

from app.retriever import CHUNKS  # noqa: E402
from lab import ledger  # noqa: E402
from lab.claude_model import ClaudeCLI  # noqa: E402

# 문맥 하나 = 정책 문서 하나의 모든 절
by_doc = defaultdict(list)
for c in CHUNKS:
    by_doc[c["source"]].append(c["text"])
sources, contexts = list(by_doc), list(by_doc.values())

synth = Synthesizer(
    model=ClaudeCLI("sonnet", tag="synth"),
    max_concurrent=4,
    evolution_config=EvolutionConfig(num_evolutions=1),
    styling_config=StylingConfig(
        scenario="온라인 쇼핑몰 「모아마켓」 고객이 배송 · 반품 · 교환 · 적립금 · 결제 정책을 한국어로 묻는다.",
        task="정책 문서에 근거해 고객 질문에 답하는 고객 지원 봇",
        input_format="고객이 쓰는 말투의 한국어 질문 한두 문장. 구체적인 상황(금액 · 날짜 · 등급)을 넣는다.",
        expected_output_format="한국어 두세 문장. 가능 여부나 최종 숫자를 먼저 말하고 근거 조건을 붙인다.",
    ),
)
t0 = time.time()
goldens = synth.generate_goldens_from_contexts(contexts=contexts, max_goldens_per_context=2, source_files=sources)

out = [{"id": f"s{i + 1:02d}", "category": "합성", "kind": "합성", "source": g.source_file, "reviewed": False,
        "input": g.input, "expected_output": g.expected_output,
        "evolutions": (g.additional_metadata or {}).get("evolutions"),
        "quality": (g.additional_metadata or {}).get("synthetic_input_quality")} for i, g in enumerate(goldens)]
json.dump(out, open("goldens/synth_raw.json", "w"), ensure_ascii=False, indent=1)
ledger.append({"label": "synthesize", "kind": "synth", "count": len(out), "seconds": round(time.time() - t0), "file": "goldens/synth_raw.json"})
print(f"\n합성 {len(out)}건 · {round(time.time() - t0)}초 → goldens/synth_raw.json")
for g in out:
    print(f"  {g['id']} [{g['source']}] {g['input'][:60]}")
