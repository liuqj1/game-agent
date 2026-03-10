import os
import shutil
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from agents import story_agent, script_agent, js_agent
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver


# ===============================
# 定义状态结构
# ===============================
class GameState(TypedDict, total=False):
    thread_id: str
    requirement: str
    stories: List
    user_choice: str
    selected_story: str
    script: str  # 原始剧本
    story_js: str  # 生成的 JS


# ===============================
# 用户选择节点
# ===============================



def user_select_node(state: GameState):

    choice = state.get("user_choice")

    # ????? / ?????????? choice ? ????? 3 ??????
    if not choice:
        return interrupt({
            "stories": state["stories"],
            "message": "选择版本 1 / 2 / 3或者点击重新生成",
        })

    # =========================
    # 1?? ????????
    # =========================
    if choice == "重新生成":
        # ?? Command ????? story_agent??????? user_select ?? interrupt
        return Command(
            goto="story_agent",
            update={
                "user_choice": None,
                "selected_story": None,
                "script": None,
                "story_js": None,
            },
        )

    # =========================
    # 2?? ???? 1 / 2 / 3
    # =========================
    try:
        version = int(str(choice).strip())
    except ValueError:
        version = 1

    selected = next((s for s in state["stories"] if s.get("version") == version), None)

    if not selected:
        selected = state["stories"][0]

    return {"selected_story": selected}

# ===============================
# 保存文件节点
# ===============================

def save_file_node(state: GameState):

    thread_id = state.get("thread_id")

    if not thread_id:
        print("❌ thread_id 不存在")
        return {}

    # ===============================
    # 1️⃣ 创建 thread_id 目录
    # ===============================
    base_dir = os.path.join("games", thread_id)

    os.makedirs(base_dir, exist_ok=True)

    print(f"📁 创建目录: {base_dir}")

    # ===============================
    # 2️⃣ 保存剧本
    # ===============================
    if "script" in state:
        script_path = os.path.join(base_dir, "game_script.txt")

        with open(script_path, "w", encoding="utf-8") as f:
            f.write(state["script"])

        print(f"✅ 剧本已保存: {script_path}")

    # ===============================
    # 3️⃣ 保存 JS
    # ===============================
    if "story_js" in state:
        js_path = os.path.join(base_dir, "story.js")

        with open(js_path, "w", encoding="utf-8") as f:
            f.write(state["story_js"])

        print(f"✅ JS 已保存: {js_path}")

    # ===============================
    # 4️⃣ 复制 index.html
    # ===============================
    src_index = "index.html"
    dst_index = os.path.join(base_dir, "index.html")

    if os.path.exists(src_index):
        shutil.copy(src_index, dst_index)
        print(f"📄 index.html 已复制到: {dst_index}")
    else:
        print("⚠ 当前目录没有 index.html")

    return {}


# ===============================
# 构建 LangGraph
# ===============================


def build_graph():
    workflow = StateGraph(GameState)

    workflow.add_node("story_agent", story_agent)
    workflow.add_node("user_select", user_select_node)
    workflow.add_node("script_agent", script_agent)
    workflow.add_node("js_agent", js_agent)
    workflow.add_node("save_file", save_file_node)

    workflow.set_entry_point("story_agent")

    workflow.add_edge("story_agent", "user_select")
    workflow.add_edge("user_select", "script_agent")
    workflow.add_edge("script_agent", "js_agent")
    workflow.add_edge("js_agent", "save_file")
    workflow.add_edge("save_file", END)

    memory = MemorySaver()

    return workflow.compile(checkpointer=memory)
