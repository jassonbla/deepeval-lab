"""정책 문서 검색기 — 임베딩 없이 글자 두 개(bigram) 겹침으로 고른다.
일부러 단순하게 만들었다. 검색이 틀리는 경우를 평가로 찾아내는 것이 실습 목적이다."""
import glob
import os
import re

from deepeval.test_case import LLMTestCase
from deepeval.tracing import observe, update_current_span

DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")


def load_chunks():
    """문서를 `## ` 절 단위로 자른다. 한 조각 = 「문서 제목 > 절 제목」 + 본문."""
    chunks = []
    for path in sorted(glob.glob(os.path.join(DOCS, "*.md"))):
        text = open(path).read()
        title = text.splitlines()[0].lstrip("# ").strip()
        for part in re.split(r"\n(?=## )", text)[1:]:
            head, _, body = part.partition("\n")
            chunks.append({"source": os.path.basename(path), "text": f"[{title} > {head.lstrip('# ').strip()}]\n{body.strip()}"})
    return chunks


def _bigrams(s: str):
    s = re.sub(r"\s+", "", s)
    return {s[i:i + 2] for i in range(len(s) - 1)}


CHUNKS = load_chunks()

# 컴포넌트 평가(단계 9)가 여기에 메트릭을 만드는 함수를 넣는다: {"retriever": lambda: [...], "llm": lambda: [...]}
# 비어 있으면 span 은 기록만 되고 채점되지 않는다.
SPAN_METRICS = {}


def span_metrics(kind: str):
    make = SPAN_METRICS.get(kind)
    return make() if make else None


@observe(type="retriever")
def retrieve(question: str, top_k: int = 2, extra_query: str = ""):
    """extra_query = 질문을 정책 용어로 바꾼 검색어 (v3 · 고객 말투와 문서 용어가 달라 검색이 빗나가는 것을 줄인다)."""
    q = _bigrams(question + " " + extra_query)
    scored = sorted(CHUNKS, key=lambda c: len(q & _bigrams(c["text"])), reverse=True)
    picked = [c["text"] for c in scored[:top_k]]
    update_current_span(test_case=LLMTestCase(input=question, actual_output="\n\n".join(picked), retrieval_context=picked),
                        metrics=span_metrics("retriever"))
    return picked
