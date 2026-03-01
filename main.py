import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
import uuid

from starlette.middleware.cors import CORSMiddleware

from graph import build_graph

app = FastAPI()

# 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
graph = build_graph()


class StartRequest(BaseModel):
    requirement: str


class ResumeRequest(BaseModel):
    thread_id: str
    user_choice: str


# ===============================
# 1️⃣ 启动流程
# ===============================
@app.post("/start")
def start(data: StartRequest):
    # print(data)
    thread_id = str(uuid.uuid4())

    result = graph.invoke(
        {"requirement": data.requirement},
        config={"configurable": {"thread_id": thread_id}}
    )

    return {
        "thread_id": thread_id,
        "response": result
    }


# ===============================
# 2️⃣ 用户选择后继续执行
# ===============================
@app.post("/resume")
def resume(data: ResumeRequest):

    result = graph.invoke(
        {"user_choice": data.user_choice},
        config={"configurable": {"thread_id": data.thread_id}}
    )

    return result

if __name__ == "__main__":
    print("🚀 Server running at http://localhost:8001")
    uvicorn.run(
        "main:app",          # ⚠ 推荐用字符串方式
        host="0.0.0.0",
        port=8001,
        reload=True          # 开发环境建议开启
    )