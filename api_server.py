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
    result_data = compare_MBR_VSB(filepaths)

    # Check for errors returned from the comparison script, e.g., MBR file not found
    if result_data and 'error' in result_data:
        print(f"[mbr-vsb-chk-fs] Error from comparison script: {result_data['error']}")
        return JSONResponse(status_code=400, content=result_data)

    output_csv_path = result_data.get('output_file')
    sum_missing = result_data.get('sum_missing')
    count_missing = result_data.get('count_missing')
    # Copy/move output to /tmp/output_<uuid>.csv
    tmp_dir = "/tmp"
    out_uuid = str(uuid.uuid4())
    out_path = os.path.join(tmp_dir, f"output_{out_uuid}.csv")
    if output_csv_path and os.path.exists(output_csv_path):
        import shutil
        shutil.copy(output_csv_path, out_path)
        print(f"[mbr-vsb-chk-fs] Output file saved: {out_path}")
        print("[mbr-vsb-chk-fs] === Function end ===")
        return {
            "output_file": out_path,
            "sum_missing": sum_missing,
            "count_missing": count_missing
        }
    else:
        print("[mbr-vsb-chk-fs] Failed to generate output CSV.")
        print("[mbr-vsb-chk-fs] === Function end ===")
        return JSONResponse(status_code=500, content={"error": "Failed to generate output CSV"})