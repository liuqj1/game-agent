from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from agents import story_agent, script_agent, js_agent
from langgraph.types import interrupt
from langgraph.checkpoint.memory import MemorySaver


# ===============================
# 定义状态结构
# ===============================
class GameState(TypedDict, total=False):
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
    # 第一次执行时没有 user_choice → 中断
    if "user_choice" not in state:
        return interrupt({
            "stories": state["stories"],
            "message": "请选择版本 1 / 2 / 3"
        })

    # resume 后带着 user_choice
    choice = int(state["user_choice"])

    # 从 stories 中找对应版本
    selected = next(
        (s for s in state["stories"] if s["version"] == choice),
        None
    )

    # 如果没找到，默认选第一个
    if not selected:
        selected = state["stories"][0]

    return {
        "selected_story": selected
    }


# ===============================
# 保存文件节点
# ===============================
def save_file_node(state: GameState):
    # 保存原始剧本
    if "script" in state:
        with open("game_script.txt", "w", encoding="utf-8") as f:
            f.write(state["script"])

        print("✅ 剧本已保存为 game_script.txt")

    # 保存生成的 JS
    if "story_js" in state:
        with open("story.js", "w", encoding="utf-8") as f:
            f.write(state["story_js"])

        print("✅ story.js 已生成")

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
