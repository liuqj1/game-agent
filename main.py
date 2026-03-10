import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
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

# 静态资源：聊天 UI 和生成的游戏目录
app.mount("/ui", StaticFiles(directory="web", html=True), name="ui")
app.mount("/games", StaticFiles(directory="games"), name="games")


class StartRequest(BaseModel):
    requirement: str


class ResumeRequest(BaseModel):
    thread_id: str
    user_choice: str


@app.get("/")
def root():
    return RedirectResponse(url="/ui/chat.html")


# ===============================
# 1️⃣ 启动流程
# ===============================
@app.post("/story/generate")
def generate(data: StartRequest):
    thread_id = str(uuid.uuid4())

    result = graph.invoke(
        {
            "thread_id": thread_id,
            "requirement": data.requirement,
        },
        config={"configurable": {"thread_id": thread_id}},
    )

    # 如果中途有 interrupt
    if "__interrupt__" in result:
        interrupt_obj = result["__interrupt__"][0]
        return {
            "type": "interrupt",
            "thread_id": thread_id,
            "data": interrupt_obj.value,
        }

    # 兜底：没有 interrupt（理论上不会发生），直接返回当前结果
    return {
        "type": "code",
        "thread_id": thread_id,
        "data": {
            "user_choice": result.get("user_choice"),
            "selected_story": result.get("selected_story"),
            "script": result.get("script"),
            "story_js": result.get("story_js"),
        },
    }


# ===============================
# 2️⃣ 用户选择后继续执行
# ===============================
@app.post("/story/choose")
def choose(data: ResumeRequest):
    result = graph.invoke(
        {"user_choice": data.user_choice},
        config={"configurable": {"thread_id": data.thread_id}},
    )

    if "__interrupt__" in result:
        interrupt_obj = result["__interrupt__"][0]
        return {
            "type": "interrupt",
            "thread_id": data.thread_id,
            "data": interrupt_obj.value,
        }

    return {
        "type": "code",
        "data": {
            "user_choice": result.get("user_choice"),
            "selected_story": result.get("selected_story"),
            "script": result.get("script"),
            "story_js": result.get("story_js"),
        },
    }


if __name__ == "__main__":
    print("📝 API地址: http://localhost:8001")
    print("🖥️ UI地址: http://localhost:8001/")
    print("📚 API文档: http://localhost:8001/docs")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
    )
