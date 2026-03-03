import uvicorn
from fastapi import FastAPI
from langgraph.errors import GraphInterrupt
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
@app.post("/story/generate")
def generate(data: StartRequest):
    # print(data)
    thread_id = str(uuid.uuid4())


    result = graph.invoke(
        {"requirement": data.requirement},
        config={"configurable": {"thread_id": thread_id}}
    )
    print(result)
    print(type(result))
    # return {
    #     "thread_id": thread_id,
    #     "response": result
    # }
    # 如果中途有interrupt
    if "__interrupt__" in result:
        interrupt_obj = result["__interrupt__"][0]

        return {
            "type": "interrupt",
            "thread_id": thread_id,
            "data": interrupt_obj.value  # ✅ 用 .value
        }



# ===============================
# 2️⃣ 用户选择后继续执行
# ===============================
@app.post("/story/choose")
def choose(data: ResumeRequest):

    result = graph.invoke(
        {"user_choice": data.user_choice},
        config={"configurable": {"thread_id": data.thread_id}}
    )

    # 只返回你需要的字段
    return {
        "type": "code",
        "data": {
            "user_choice": result.get("user_choice"),
            "selected_story": result.get("selected_story"),
            "script": result.get("script"),
            "story_js": result.get("story_js"),
        }
    }

if __name__ == "__main__":
    print("📝 API地址: http://localhost:8001")
    print("📚 API文档: http://localhost:8001/docs")
    uvicorn.run(
        "main:app",          # ⚠ 推荐用字符串方式
        host="0.0.0.0",
        port=8001,
        reload=True          # 开发环境建议开启
    )
