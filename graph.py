from typing import TypedDict
from langgraph.graph import StateGraph, END
from agents import story_agent, script_agent


# ===============================
# 定义状态结构
# ===============================
class GameState(TypedDict):
    requirement: str
    stories: str
    selected_story: str
    script: str


# ===============================
# 用户选择节点
# ===============================
def user_select_node(state: GameState):

    print("\n====== 剧情版本 ======\n")
    print(state["stories"])

    choice = input("\n请选择版本（1/2/3）：")

    sections = state["stories"].split("版本")
    selected = None

    for sec in sections:
        if sec.strip().startswith(choice):
            selected = sec
            break

    if not selected:
        selected = sections[1]

    return {"selected_story": selected}


# ===============================
# 保存文件节点
# ===============================
def save_file_node(state: GameState):

    with open("game_script.txt", "w", encoding="utf-8") as f:
        f.write(state["script"])

    print("\n✅ 剧本已保存为 game_script.txt")

    return {}


# ===============================
# 构建 LangGraph
# ===============================
def build_graph():

    workflow = StateGraph(GameState)

    workflow.add_node("story_agent", story_agent)
    workflow.add_node("user_select", user_select_node)
    workflow.add_node("script_agent", script_agent)
    workflow.add_node("save_file", save_file_node)

    workflow.set_entry_point("story_agent")

    workflow.add_edge("story_agent", "user_select")
    workflow.add_edge("user_select", "script_agent")
    workflow.add_edge("script_agent", "save_file")
    workflow.add_edge("save_file", END)

    return workflow.compile()