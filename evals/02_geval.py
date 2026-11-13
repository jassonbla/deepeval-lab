"""단계 2 — 단계 1에서 ExactMatch 가 틀렸다고 한 「여섯」 을 Judge LLM(GEval)으로 다시 채점한다.
사용: .venv/bin/python evals/02_geval.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from deepeval import evaluate
from deepeval.evaluate.configs import AsyncConfig, DisplayConfig
from deepeval.metrics import ExactMatchMetric
from deepeval.test_case import LLMTestCase

from lab.metrics import correctness

cases = [
    LLMTestCase(input="2 곱하기 3은?", actual_output="6", expected_output="6"),
    LLMTestCase(input="2 곱하기 3은?", actual_output="여섯", expected_output="6"),  # 뜻은 같다
    LLMTestCase(input="2 곱하기 3은?", actual_output="5입니다.", expected_output="6"),  # 틀렸다
]

evaluate(test_cases=cases, metrics=[ExactMatchMetric(), correctness()],
         async_config=AsyncConfig(max_concurrent=4), display_config=DisplayConfig(inspect_after_run=False, truncate_passing_cases=False))
