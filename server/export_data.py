"""정적 배포용 — 결과 화면이 읽는 데이터(/api/data 와 같은 모양)를 JSON 파일 하나로 내보낸다.
공개 배포본에는 서버가 없으므로 「Ask the bot」 은 빠지고, 화면은 이 파일만 읽는다.
사용: .venv/bin/python server/export_data.py <출력 경로>   (cd web && npm run snapshot 이 web/data/snapshot.json 으로 부른다)"""
import json
import os
import sys
import time

OUT = os.path.abspath(sys.argv[1])
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import serve  # noqa: E402  (레포 맨 위로 chdir 한다)

d = serve.data()
d["exported_at"] = time.strftime("%Y-%m-%d %H:%M")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(d, open(OUT, "w"), ensure_ascii=False)
print(f"{OUT} · {os.path.getsize(OUT) // 1024} KB · 기록부 {len(d['ledger'])}줄 · 골든셋 {len(d['goldens'])}개")
