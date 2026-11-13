"""`claude -p`(구독) 를 부르는 한 곳. 평가 대상 앱과 Judge 가 같이 쓴다.

DeepEval 은 `DeepEvalBaseLLM` 을 상속한 모델을 Judge 로 받는다. 메트릭은
`generate(prompt, schema=...)` 로 부르고, schema 인스턴스가 돌아오면 그대로 쓰고
문자열이 돌아오면 JSON 으로 해석한다 (deepeval/metrics/utils/generation.py).
"""
import asyncio
import json
import os
import subprocess
import threading
import time

from deepeval.models import DeepEvalBaseLLM

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LLM_CWD = os.path.join(ROOT, ".llm_cwd")  # 빈 폴더 — 프로젝트 문맥이 섞이지 않게
CALL_LOG = os.path.join(ROOT, "results", "calls.jsonl")

# 구독 한도를 한꺼번에 쓰지 않게 동시에 도는 호출 수를 묶는다
_SEM = threading.BoundedSemaphore(int(os.environ.get("LAB_MAX_CONCURRENT", "4")))
_LOG_LOCK = threading.Lock()


def call_claude(prompt: str, model: str, system: str = None, tag: str = "", timeout: int = 240) -> str:
    """모델 호출 한 번. 프롬프트는 표준 입력으로 넘긴다 (`-` 로 시작해도 옵션으로 읽히지 않게)."""
    os.makedirs(LLM_CWD, exist_ok=True)
    cmd = ["claude", "-p", "--model", model, "--setting-sources", "", "--strict-mcp-config",
           "--tools", "", "--no-session-persistence", "--output-format", "json"]
    if system:
        cmd += ["--system-prompt", system]
    last = ""
    for attempt in range(3):
        t0 = time.time()
        with _SEM:
            r = subprocess.run(cmd, input=prompt, cwd=LLM_CWD, capture_output=True, text=True, timeout=timeout)
        try:
            d = json.loads(r.stdout)
        except Exception:
            last = f"출력 해석 실패: {r.stdout[:200]} {r.stderr[:200]}"
            time.sleep(2 * (attempt + 1))
            continue
        if d.get("is_error") or d.get("terminal_reason") == "api_error":
            last = f"호출 실패: {str(d.get('result'))[:200]}"
            time.sleep(2 * (attempt + 1))
            continue
        _log(tag, model, prompt, d, time.time() - t0)
        return d.get("result") or ""
    raise RuntimeError(f"claude -p {last}")


def _log(tag, model, prompt, d, seconds):
    os.makedirs(os.path.dirname(CALL_LOG), exist_ok=True)
    row = {"at": time.strftime("%Y-%m-%d %H:%M:%S"), "run": os.environ.get("LAB_RUN", ""), "tag": tag, "model": model,
           "seconds": round(seconds, 2), "prompt_chars": len(prompt), "result_chars": len(d.get("result") or ""),
           "api_price_usd": d.get("total_cost_usd")}  # 구독이라 실제 청구는 아님 — API 단가로 환산한 참고 값
    with _LOG_LOCK, open(CALL_LOG, "a") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def _extract_json(text: str):
    start, end = text.find("{"), text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("JSON 없음")
    return json.loads(text[start:end])


class ClaudeCLI(DeepEvalBaseLLM):
    """DeepEval Judge 로 쓰는 `claude -p` 모델."""

    SYSTEM = "You are a precise evaluator. Follow the instructions exactly and output only what is asked."

    def __init__(self, model: str = "sonnet", tag: str = "judge"):
        self.cli_model = model
        self.tag = tag
        super().__init__(model)

    def load_model(self):
        return None

    def generate(self, prompt: str, schema=None):
        text = call_claude(prompt, self.cli_model, system=self.SYSTEM, tag=self.tag)
        if schema is None:
            return text
        try:
            return schema.model_validate(_extract_json(text))
        except Exception:
            pass
        # 글자 칸 하나짜리 schema (예: Synthesizer 의 Response{response}) — 프롬프트가 JSON 을 요구하지 않아
        # 모델이 그냥 글로 답한다. Synthesizer 는 schema 인스턴스가 돌아온다고 가정하므로 감싸서 돌려준다.
        fields = schema.model_fields
        if len(fields) == 1 and next(iter(fields.values())).annotation is str:
            return schema(**{next(iter(fields)): text.strip()})
        # 그 밖의 schema — JSON 모양을 알려 주고 한 번 더 시킨다
        retry = call_claude(f"{prompt}\n\nReturn ONLY a JSON object matching this JSON schema:\n{json.dumps(schema.model_json_schema(), ensure_ascii=False)}",
                            self.cli_model, system=self.SYSTEM, tag=self.tag)
        try:
            return schema.model_validate(_extract_json(retry))
        except Exception:
            return retry  # DeepEval 메트릭은 문자열을 JSON 으로 다시 해석해 본다

    async def a_generate(self, prompt: str, schema=None):
        return await asyncio.to_thread(self.generate, prompt, schema)

    def get_model_name(self):
        return f"claude -p {self.cli_model}"
