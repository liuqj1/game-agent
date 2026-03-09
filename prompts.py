STORY_PROMPT = """
你是一名专业的游戏编剧。

请根据用户需求：
{requirement}

生成 3 个不同风格的剧情版本。

每个版本必须包含以下字段：

- title（字符串）
- summary（100~200字剧情简介）
- full_story（600-800字的完整剧情，结构完整，有起承转合）

⚠️ 严格要求：

- 只能返回合法 JSON
- 不要输出解释
- 不要输出 Markdown
- 不要使用 ``` 符号
- 不要添加任何额外文本
- 必须保证可以被 json.loads() 直接解析

输出格式必须严格如下：

{{
  "stories": [
    {{
      "version": 1,
      "title": "",
      "summary": "",
      "full_story": ""
    }},
    {{
      "version": 2,
      "title": "",
      "summary": "",
      "full_story": ""
    }},
    {{
      "version": 3,
      "title": "",
      "summary": "",
      "full_story": ""
    }}
  ]
}}
"""

SCRIPT_PROMPT = """
你是一名游戏对话设计师。

根据以下剧情：

{story}

生成完整游戏对话脚本：

要求：
1. 至少3个角色
2. 使用：
角色名：对白
3. 包含分支选择
4. 结构清晰
"""

JS_GENERATE_PROMPT = """
你是一个专业的“文字剧情游戏引擎编译器”。

任务：
把输入的“对话/剧情脚本”转换成一个可直接被浏览器加载运行的 `story.js` 数据文件。

必须遵守：
1) 只输出最终的 JavaScript 文件内容，不要输出解释、不要输出 Markdown、不要使用 ```。
2) 输出必须是合法 JavaScript，不能有语法错误，不能被截断。
3) 禁止在同一个对象里重复同名 key（例如同一个节点不要写两个 text）。

顶层格式（二选一，推荐第一种）：
A) 推荐：
  globalThis.route = {{}};
  globalThis.story = [ ... ];

B) 兼容：
  let route = {{}};
  const story = [ ... ];
  // 并在文件末尾把 story/route 赋值给 globalThis.story/globalThis.route

每个剧情节点建议包含：
{{
  id: "",
  bg: "img/office.jpg",
  name: "角色名",
  text: "对白/叙述"
}}
id是每个剧情节点的索引，从1开始。

你可以在节点里额外控制更多信息（按需输出，不需要就不要写）：
- speaker: "left" | "center" | "right"  （用于“说话角色高亮”）
- char: "" 或 {{ left: "img/xx.png", center: "img/xx.png", right: "img/xx.png" }}  （左右/中立绘）
  - 若只需要单人立绘，也可以用 char: "img/xx.png"（默认显示在右侧，兼容老格式）
- cg: "img/cg_xx.jpg"  （可选，全屏 CG 覆盖）
- bgm: "audio/bgm_xx.mp3"  （可选，背景音乐；要停止可用 "__stop__"）
- sfx: "audio/sfx_xx.mp3"  （可选，音效）
- next: 数字  （可选，强制跳转到指定索引；否则默认按顺序 +1）,next不得与当前节点id相同，造成死循环。

分支结构必须是：
{{
  choice: [
    {{ text: "选项文本", next: 数字 }},
    {{ text: "选项文本", next: 数字 }}
  ]
}}

所有 next 索引必须真实存在（包括 choice 的 next 和节点的 next）。

结局节点必须包含：
- ending: true
- 并提供 text（字符串或 function 均可）

背景图片请优先从以下列表中选择（按剧情合理分配）：
- img/office.jpg
- img/chatroom.jpg
- img/datacenter.jpg
- img/corehall.jpg

以下是剧情脚本：

{script}

只输出最终 JS 文件内容。
"""
# =====================
# JS 补全 / 修复提示词
# =====================

JS_CONTINUE_PROMPT = """
你上一次输出的 story.js 代码被截断或中间断裂，导致 JS 无法解析。

错误信息：
{error}

要求：
- 只输出需要“追加”的 JavaScript 代码（从断点继续），不要重复已输出部分。
- 不要输出解释、不要输出 Markdown、不要使用 ```。
- 如果断点落在一个对象/字符串/数组中间，请先把它补齐。
- 确保最终 `story` 数组完整结束（建议以 `];` 或 `globalThis.story = [...]` 的结尾结束）。

已输出内容的末尾（最后 2000 字符）：
{tail}
"""

JS_REPAIR_PROMPT = """
你上一次生成的 story.js 存在语法/结构错误或中间断裂，导致无法运行。

错误信息：
{error}

请你在“不改变剧情内容含义”的前提下，直接输出一份【完整可运行】的 story.js。

硬性要求：
- 只输出最终 JavaScript 文件内容。
- 不要输出解释、不要输出 Markdown、不要使用 ```。
- globalThis.story 必须是一个数组，globalThis.route 必须是一个对象。
- 禁止在同一个对象里重复同名 key（例如同一个节点不要写两个 text）。
- choice/next 的索引必须存在。
- 避免出现字符串裸换行导致语法错误（需要换行请用 \n）。

参考：已有代码末尾（最后 4000 字符，仅供对齐风格/字段）：
{tail}

原始剧情脚本如下（以此为准，必要时可重新生成整份 story.js）：

{script}
"""


# =====================
# JSON 兜底提示词
# =====================

STORY_JSON_PROMPT = """
你是一个专业的文字剧情游戏数据编译器。

请把下面的脚本转换成【严格 JSON】（只能输出 JSON，不能有任何额外文本）。

JSON 顶层必须是一个对象，格式如下：

{{
  "route": {{}},
  "story": [
    {{
      "bg": "img/office.jpg",
      "name": "角色名",
      "text": "对白/叙述",
      "speaker": "left",
      "char": {{"left":"img/a.png","center":"","right":"img/b.png"}},
      "bgm": "audio/bgm.mp3",
      "sfx": "audio/sfx.mp3",
      "cg": "img/cg.jpg",
      "next": 1
    }},
    {{
      "choice": [{{"text":"选项","next": 10}}]
    }},
    {{
      "ending": true,
      "text": "结局文本"
    }}
  ]
}}

注意：
- 必须是合法 JSON（双引号、不能有函数、不能有注释）。
- 所有字符串里的换行必须用 \n 表示，禁止出现裸换行导致 JSON 断裂。
- 禁止同一对象出现重复 key。
- 所有 next 索引必须存在（choice 的 next 和节点 next）。
- 只输出 JSON，不要 Markdown，不要解释。

脚本如下：

{script}
"""

STORY_JSON_CONTINUE_PROMPT = """
上一次输出的 JSON 不完整或不合法，无法被 json.loads 解析。

解析错误：
{error}

要求：
- 只输出需要追加的 JSON 片段（从断点继续），不要重复已输出部分。
- 只能输出 JSON 内容，不要解释，不要 Markdown，不要 ```。

已输出末尾（最后 2000 字符）：
{tail}
"""

STORY_JSON_REPAIR_PROMPT = """
下面这段 JSON 不完整或不合法，无法解析。

解析错误：
{error}

请在“不改变剧情内容含义”的前提下，把它修复成一份可被 json.loads 解析的【严格 JSON】。

硬性要求：
- 只输出 JSON，不要解释，不要 Markdown，不要 ```。
- 禁止同一对象重复 key。
- 所有字符串换行必须写成 \n。
- 顶层必须包含 route(对象) 和 story(数组)。

需要修复的原始内容如下：
{full}
"""
