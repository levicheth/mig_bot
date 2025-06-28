# uvicorn api_server:app --host 0.0.0.0 --port 3333

# api_server.py
from fastapi import FastAPI, Request, UploadFile, File
from pydantic import BaseModel
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi import Body
from logic.Comp.vsblt import compare_MBR_VSB
import logging
import os
import uuid

app = FastAPI()

# 🔁 Simple health check
@app.get("/healthz")
async def health():
    return {"status": "ok"}

@app.post("/mbr-vsb-chk-fs")
async def mbr_vsb_chk_fs(payload: dict = Body(...)):
    print("[mbr-vsb-chk-fs] === Function start ===")
    filepaths = payload.get("filepaths", [])
    print(f"[mbr-vsb-chk-fs] Input file paths: {filepaths}")
    if not filepaths:
        print("[mbr-vsb-chk-fs] No file paths provided, aborting.")
        return JSONResponse(status_code=400, content={"error": "No file paths provided"})
    # Call compare_MBR_VSB with filepaths
    output_csv_path = compare_MBR_VSB(filepaths)
    # Copy/move output to /tmp/output_<uuid>.csv
    tmp_dir = "/tmp"
    out_uuid = str(uuid.uuid4())
    out_path = os.path.join(tmp_dir, f"output_{out_uuid}.csv")
    if output_csv_path and os.path.exists(output_csv_path):
        import shutil
        shutil.copy(output_csv_path, out_path)
        print(f"[mbr-vsb-chk-fs] Output file saved: {out_path}")
        print("[mbr-vsb-chk-fs] === Function end ===")
        return {"output_file": out_path}
    else:
        print("[mbr-vsb-chk-fs] Failed to generate output CSV.")
        print("[mbr-vsb-chk-fs] === Function end ===")
        return JSONResponse(status_code=500, content={"error": "Failed to generate output CSV"})