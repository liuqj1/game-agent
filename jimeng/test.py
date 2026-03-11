from pathlib import Path
from jimeng.jimeng_generate_images_for_game_dir_scaled import generate_images_for_dir_scaled


def main():

    # 游戏目录
    game_dir = Path("../games/e4903b91-b49f-43dd-899c-5c2ed1b35188")

    # 是否覆盖已有图片
    overwrite = False

    written = generate_images_for_dir_scaled(
        game_dir,
        overwrite=overwrite,
    )

    print("生成完成")
    print("图片数量:", len(written))

    for p in written:
        print("生成:", p)


if __name__ == "__main__":
    main()