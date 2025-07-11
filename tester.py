import os
from dotenv import dotenv_values
from google import genai
import argparse
from google.genai import types
from github import Github, Auth
from search import Search
from evaluator import Evaluator
from utils import scrape_context7_snippets
from main import create_file
import os

env_config = dotenv_values(".env")

client = genai.Client(api_key=env_config["GEMINI_API_TOKEN"])
auth = Auth.Token(env_config["GITHUB_TOKEN"])
g = Github(auth=auth)

# Web search tool
grounding_tool = types.Tool(google_search=types.GoogleSearch())
url_context_tool = types.Tool(url_context=types.UrlContext())
model_config = types.GenerateContentConfig(tools=[grounding_tool, url_context_tool],
                                           response_modalities=["TEXT"])
source_to_snippet_urls = {
                "https://zh.d2l.ai/",
                "https://ctrl-plex.vercel.app/",
                "https://github.com/dotnet/maui",
                "https://tailwindcss.com/docs/installation/using-vite",
                "https://github.com/technomancy-dev/00",
                "https://github.com/jdan/98.css",
                "https://github.com/aave-dao/aave-v3-origin",
                "https://www.x.org/releases/current/doc/",
                "https://www.adaline.ai/docs/overview",
                "https://adk.wiki/",
                "https://biopython.org/wiki/Documentation"
        }

def test_file_path():
    for key in source_to_snippet_urls.keys():
        print(f"📊 Testing create_file for {key}")
        try:
            path = key.replace("/", "\\")
            with open(f"important_info/{path}.txt", "w") as f:
                f.write(f"Google search results: ")
            print(f"✅ Created file for {key}")
            os.remove(f'important_info/{path}.txt')
            print(f"✅ Removed file for {key}")
        except Exception as e:
            print(f"❌ Error creating files for {key}: {e}")

     
# TODO tests
# code_snippet_length: https://context7.com/context7/coderabbitai_github_io-bitbucket, https://context7.com/context7/tailwindcss, https://context7.com/eclipse-4diac/4diac-forte, https://context7.com/humanlayer/12-factor-agents
# multiple_code_snippets: https://context7.com/context7/tailwindcss, https://context7.com/1password/onepassword-sdk-js, https://context7.com/nvidia-omniverse/ext-7z
# language_checker: https://context7.com/eclipse-4diac/4diac-forte, https://context7.com/technomancy-dev/00, https://context7.com/pnxenopoulos/awpy, https://context7.com/aflplusplus/aflplusplus

test_file_path()
print("--------------------------------")

      