import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from prompts import STORY_PROMPT, SCRIPT_PROMPT

load_dotenv()

# llm = ChatOpenAI(
#     model="gpt-4o-mini",
#     temperature=0.8
# )
llm = ChatOpenAI(
    api_key=os.getenv("DeepSeek_KEY"),
    base_url="https://api.deepseek.com/v1",
    model="deepseek-chat",   # or deepseek-coder
    temperature=0.3,
    max_tokens=8192  # 不够长会导致输出截断
)

def story_agent(state):
    prompt = ChatPromptTemplate.from_template(STORY_PROMPT)
    chain = prompt | llm
    result = chain.invoke({
        "requirement": state["requirement"]
    })

    return {"stories": result.content}


def script_agent(state):
    prompt = ChatPromptTemplate.from_template(SCRIPT_PROMPT)
    chain = prompt | llm
    result = chain.invoke({
        "story": state["selected_story"]
    })

    return {"script": result.content}