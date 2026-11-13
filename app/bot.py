"""평가 대상 — 가짜 쇼핑몰 「모아마켓」 고객 지원 봇 (검색 + 답변).
프롬프트를 버전으로 나눠 두고, 버전을 바꿔 가며 점수를 비교한다."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from deepeval.test_case import LLMTestCase
from deepeval.tracing import observe, update_current_span

from app.retriever import retrieve, span_metrics
from lab.claude_model import call_claude

APP_MODEL = "haiku"

PROMPTS = {
    # 기준선 — 평범한 프롬프트. 문서에 없을 때 어떻게 할지 말하지 않는다.
    "v1": {"top_k": 2, "text": """당신은 모아마켓 고객 지원 봇입니다. 아래 정책 문서를 참고해 고객 질문에 답하세요.

[정책 문서]
{docs}

[질문]
{question}"""},
    # 일부러 나쁘게 만든 버전 — 회귀(점수 하락)를 평가가 잡아내는지 본다.
    "v0_bad": {"top_k": 1, "text": """당신은 모아마켓 고객 지원 봇입니다. 고객이 기분 좋도록 항상 긍정적으로 답하세요.
가능한지 묻는 질문에는 되도록 가능하다고 답하세요. 아래 문서는 참고만 하고, 모르는 내용은 일반 쇼핑몰 상식으로 채워 답하세요.

[참고 문서]
{docs}

[질문]
{question}"""},
    # 기준선의 실패를 보고 고친 버전.
    "v2": {"top_k": 3, "text": """당신은 모아마켓 고객 지원 봇입니다. 아래 정책 문서에 있는 내용만으로 답하세요.

규칙:
1. 가능 여부를 먼저 말하고, 근거가 되는 금액 · 기간 · 조건을 붙인다.
2. 금액 계산이 필요하면 계산해서 최종 숫자를 말한다.
3. 예외 조항(예: 불량이면 가능)이 질문과 관련 있으면 같이 말한다.
4. 정책 문서에 없는 내용은 추측하지 않는다. 「안내된 정책에서 확인되지 않습니다. 고객센터로 문의해 주세요.」 라고 답한다.
5. 두세 문장으로 답한다.

[정책 문서]
{docs}

[질문]
{question}"""},
}


# v3 — 골든셋을 키운 뒤 드러난 실패(고객 말투 ≠ 문서 용어 → 검색이 빗나감)를 고친 버전. 답변 프롬프트는 v2 그대로, 검색어만 바꾼다.
PROMPTS["v3"] = {**PROMPTS["v2"], "rewrite": True}

REWRITE = """고객 질문을 쇼핑몰 정책 문서에서 검색할 키워드로 바꾸세요.
정책 문서가 쓰는 용어를 쓰세요: 배송비, 출고, 영업일, 해외 배송, 단순 변심 반품, 불량, 환불, 교환, 재고, 회원 등급, 적립금, 회원 탈퇴, 생일 쿠폰, 결제 수단, 무통장 입금, 할부, 주문 취소, 현금 영수증.
질문과 관련 있는 용어만 골라 키워드 3~6개를 한 줄로, 쉼표 없이 띄어 써서 답하세요. 다른 말은 쓰지 마세요.

질문: {question}"""


@observe(type="llm")
def rewrite_query(question: str):
    return call_claude(REWRITE.format(question=question), APP_MODEL, tag="app-rewrite").strip().splitlines()[0][:120]


@observe(type="llm")
def generate(question: str, docs: list, prompt_version: str):
    prompt = PROMPTS[prompt_version]["text"].format(docs="\n\n".join(docs), question=question)
    out = call_claude(prompt, APP_MODEL, tag="app").strip()
    update_current_span(test_case=LLMTestCase(input=question, actual_output=out, retrieval_context=docs),
                        metrics=span_metrics("llm"))
    return out


@observe(type="agent")
def answer(question: str, prompt_version: str = "v1"):
    """질문 하나 → {"output": 답, "retrieval_context": [검색된 조각]}"""
    cfg = PROMPTS[prompt_version]
    extra = rewrite_query(question) if cfg.get("rewrite") else ""
    docs = retrieve(question, top_k=cfg["top_k"], extra_query=extra)
    out = generate(question, docs, prompt_version)
    return {"output": out, "retrieval_context": docs}


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "배송비는 얼마인가요?"
    r = answer(q, sys.argv[2] if len(sys.argv) > 2 else "v1")
    print("검색:", *[d.splitlines()[0] for d in r["retrieval_context"]])
    print("답:", r["output"])
