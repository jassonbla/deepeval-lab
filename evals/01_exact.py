"""단계 1 — 모델 호출 없이 평가의 전체 흐름을 한 번 실행한다.
사용: .venv/bin/python evals/01_exact.py"""
from deepeval import evaluate
from deepeval.metrics import ExactMatchMetric
from deepeval.test_case import LLMTestCase

cases = [
    LLMTestCase(
        input="2 곱하기 3은?",
        actual_output="6",
        expected_output="6",
    ),
    # 뜻은 같지만 문자열이 다르다 — ExactMatch 는 실패로 본다
    LLMTestCase(
        input="2 곱하기 3은?",
        actual_output="여섯",
        expected_output="6",
    ),
]

evaluate(test_cases=cases, metrics=[ExactMatchMetric()])
