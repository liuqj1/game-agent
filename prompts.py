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
你是一个专业的文字游戏引擎编译器。

任务：
把输入的剧情脚本转换为一个可运行的 story.js 数据文件。

必须遵守：

1. 输出格式必须是合法 JavaScript
2. 格式：

let route = {{}};
const story = [ ... ];

3. 每个剧情节点必须包含：
{{
  bg:"",
  name:"",
  text:"",
  char:""
}}

4. 分支结构必须为：
{{
  choice:[
    {{text:"选项", next:数字}}
  ]
}}

5. 所有 next 索引必须真实存在
6. 禁止使用 markdown
7. 禁止解释说明
8. 结局必须：

{{
  ending:true,
  text:function(){{
    return "结局文本";
  }}
}}

9. 自动为不同场景分配合理背景文件名：
   img/office.jpg
   img/chatroom.jpg
   img/datacenter.jpg
   img/corehall.jpg

以下是剧情脚本：

{script}

只输出最终 JS 文件内容。
"""
