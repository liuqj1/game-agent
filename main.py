from graph import build_graph

def main():

    app = build_graph()

    requirement = input("请输入你的游戏需求：\n")

    initial_state = {
        "requirement": requirement
    }

    app.invoke(initial_state)


if __name__ == "__main__":
    main()