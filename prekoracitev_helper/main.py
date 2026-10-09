import os
from pathlib import Path
from tempfile import TemporaryDirectory
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import shutil
import json

if __package__:
    from .logic import process_file
    from .optimal_power import process_file_optimal
else:
    from logic import process_file
    from optimal_power import process_file_optimal

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8002"))
app = FastAPI()

@app.get("/")
async def root():
    return {"status": "running"}


def process_upload(file, power_by_months, processor):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in {".csv", ".xlsx"}:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    try:
        agreed_power_map = json.loads(power_by_months)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid power_by_months JSON") from exc
    if not isinstance(agreed_power_map, dict):
        raise HTTPException(status_code=400, detail="power_by_months must be a JSON object")

    with TemporaryDirectory(prefix="omreznina-power-") as upload_dir:
        save_path = str(Path(upload_dir) / f"upload{extension}")
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        result = processor(save_path, agreed_power_map)
    return JSONResponse(result)


@app.post("/upload-file-dogovorjena-moc")
async def upload_file(
    file: UploadFile = File(...),
    power_by_months: str = Form(...)
):
    return process_upload(file, power_by_months, process_file)


@app.post("/optimal")
async def upload_file(
    file: UploadFile = File(...),
    power_by_months: str = Form(...)
):
    return process_upload(file, power_by_months, process_file_optimal)

    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
