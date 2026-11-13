"""단계 6 — 같은 평가를 pytest 테스트로. CI 에서 「점수가 기준 아래면 실패」 로 쓰는 모양이다.
사용: .venv/bin/deepeval test run evals/test_bot.py
프롬프트 버전은 환경변수 LAB_PROMPT (기본 v2)."""
import json
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from deepeval import assert_test  # noqa: E402
from deepeval.test_case import LLMTestCase  # noqa: E402

from app import bot  # noqa: E402
from lab.metrics import correctness  # noqa: E402

PROMPT = os.environ.get("LAB_PROMPT", "v2")
GOLDENS = json.load(open(os.path.join(ROOT, "goldens", "v0.json")))


@pytest.mark.parametrize("golden", GOLDENS, ids=[g["id"] for g in GOLDENS])
def test_bot_answer(golden):
    out = bot.answer(golden["input"], PROMPT)
    case = LLMTestCase(input=golden["input"], actual_output=out["output"], expected_output=golden["expected_output"],
                       retrieval_context=out["retrieval_context"])
    assert_test(case, [correctness()])
