import os
from pathlib import Path
from tempfile import TemporaryDirectory
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import shutil

if __package__:
    from .parser import filter_files, read_files, has_invalid_floats
else:
    from parser import filter_files, read_files, has_invalid_floats

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8001"))
app = FastAPI()

@app.get("/")
async def root():
    return {"status": "ok"}

@app.get("/file-to-json")
async def file_proceeser():
    result = filter_files()
    return result

@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in {".csv", ".xlsx"}:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Uploaded names must never overwrite local project files. Each request gets
    # its own temporary directory, which is removed even if parsing fails.
    with TemporaryDirectory(prefix="omreznina-parser-") as upload_dir:
        save_path = str(Path(upload_dir) / f"upload{extension}")
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        filtered_files = {"csv": [], "xlsx": []}
        filtered_files[extension[1:]].append(save_path)
        result = read_files(filtered_files)

    if has_invalid_floats(result):
        print("POZOR! JSON vsebuje še vedno NaN ali inf!!!")
    else:
        print("JSON OK: brez NaN in inf.")

    return JSONResponse(result)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
