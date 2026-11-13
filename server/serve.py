"""실습 결과 화면 — 기록부 · 건별 비교 · 컴포넌트 평가 · Judge 흔들림 · 골든셋 · 직접 묻기.
이 컴퓨터에서만 열린다 (127.0.0.1). 화면은 web/ (React + UI SDK)을 빌드한 server/dist 이고, 데이터는 요청마다 다시 읽는다.
사용: .venv/bin/python server/serve.py [포트=8765]  → http://127.0.0.1:8765"""
import glob
import json
import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)
os.environ["LAB_RUN"] = "ask"

from app import bot  # noqa: E402

DIST = os.path.realpath(os.path.join(ROOT, "server", "dist"))


def jsonl(path):
    if not os.path.exists(path):
        return []
    return [json.loads(x) for x in open(path) if x.strip()]


def data():
    calls = {}
    for c in jsonl("results/calls.jsonl"):
        a = calls.setdefault(c.get("run") or "(unnamed)", {"count": 0, "seconds": 0.0, "api_price_usd": 0.0})
        a["count"] += 1
        a["seconds"] += c.get("seconds") or 0
        a["api_price_usd"] += c.get("api_price_usd") or 0
    goldens = {os.path.basename(p)[:-5]: json.load(open(p)) for p in sorted(glob.glob("goldens/*.json"))}
    prompts = {k: {"top_k": v["top_k"], "rewrite": bool(v.get("rewrite")), "text": v["text"]} for k, v in bot.PROMPTS.items()}
    return {"ledger": jsonl("results/ledger.jsonl"), "goldens": goldens, "calls": calls, "prompts": prompts,
            "app_model": bot.APP_MODEL}


class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype):
        b = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/data":
            return self._send(200, json.dumps(data(), ensure_ascii=False), "application/json; charset=utf-8")
        # 화면은 web/ 을 빌드한 server/dist (cd web && npm run build). dist 밖의 파일은 주지 않는다.
        target = os.path.realpath(os.path.join(DIST, "index.html" if path == "/" else path.lstrip("/")))
        if not target.startswith(DIST + os.sep) or not os.path.isfile(target):
            return self._send(404, "not found", "text/plain")
        ctype = mimetypes.guess_type(target)[0] or "application/octet-stream"
        self._send(200, open(target, "rb").read(), ctype + ("; charset=utf-8" if ctype.startswith("text/") or ctype.endswith("javascript") else ""))

    def do_POST(self):
        if self.path != "/api/ask":
            return self._send(404, "not found", "text/plain")
        try:
            req = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
            q, pv = str(req.get("question") or "").strip()[:500], req.get("prompt") or "v3"
            if not q or pv not in bot.PROMPTS:
                return self._send(400, json.dumps({"error": "The question is empty or the prompt version does not exist."}, ensure_ascii=False), "application/json; charset=utf-8")
            self._send(200, json.dumps(bot.answer(q, pv), ensure_ascii=False), "application/json; charset=utf-8")
        except Exception as e:
            self._send(500, json.dumps({"error": str(e)[:300]}, ensure_ascii=False), "application/json; charset=utf-8")

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"http://127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
