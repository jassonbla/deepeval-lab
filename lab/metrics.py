"""이 실습에서 쓰는 메트릭 묶음. Judge 는 `claude -p sonnet`."""
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric, GEval
from deepeval.test_case import SingleTurnParams

from lab.claude_model import ClaudeCLI

JUDGE_MODEL = "sonnet"


def judge():
    return ClaudeCLI(JUDGE_MODEL)


def correctness(model=None, threshold=0.7):
    """기대 답과 사실이 맞는지. 채점 단계를 직접 적어 둔다 — criteria 만 주면 실행마다 단계를 새로 만들어 점수가 더 흔들린다."""
    return GEval(
        name="Correctness",
        evaluation_steps=[
            "기대 답변(expected output)에서 핵심 사실을 뽑는다: 가능 여부, 금액, 기간, 조건.",
            "실제 답변(actual output)이 그 핵심 사실 하나하나와 일치하는지 본다.",
            "핵심 사실이 반대이거나 숫자가 틀리면 매우 낮은 점수를 준다. 핵심 사실이 빠지면 중간 점수를 준다.",
            "표현 · 말투 · 길이 차이는 무시한다. 기대 답변과 충돌하지 않는 추가 안내는 감점하지 않는다.",
            "기대 답변이 「정책에서 확인되지 않음 · 단정하지 않음」 이면, 실제 답변이 가능 또는 불가능을 단정할 때 매우 낮은 점수를 준다.",
        ],
        evaluation_params=[SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.EXPECTED_OUTPUT],
        model=model or judge(),
        threshold=threshold,
    )


def rag_metrics(model=None):
    """정답 없이 보는 두 가지 — 답이 검색 문서에 근거하나(Faithfulness) · 질문에 맞는 답인가(AnswerRelevancy)."""
    m = model or judge()
    return [FaithfulnessMetric(threshold=0.7, model=m), AnswerRelevancyMetric(threshold=0.7, model=m)]


def all_metrics():
    m = judge()
    return [correctness(m)] + rag_metrics(m)
