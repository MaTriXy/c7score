import os
from dotenv import dotenv_values
from google import genai
import argparse
from google.genai import types
from github import Github, Auth
from search import Search
from evaluator import Evaluator

parser = argparse.ArgumentParser()
parser.add_argument("--url", type=str, nargs="+", required=True, help="The URL of the Github repo to scrape")
args = parser.parse_args()

urls = args.url  # Source URL (Github repo, docs, llms.txt, etc.)
env_config = dotenv_values(".env")

client = genai.Client(api_key=env_config["GEMINI_API_TOKEN"])
auth = Auth.Token(env_config["GITHUB_TOKEN"])
g = Github(auth=auth)

# Web search tool
grounding_tool = types.Tool(google_search=types.GoogleSearch())
url_context_tool = types.Tool(url_context=types.UrlContext())
model_config = types.GenerateContentConfig(tools=[grounding_tool, url_context_tool],
                                           response_modalities=["TEXT"])

for url in urls:
    # Reformat URL to be used as file name
    file_url = url.split("github.com/")[-1].replace("/", "_")

    search = Search(url, client, model_config)
    search_response = search.google_search()
    print(f"📊 URLs used for context: {search_response.candidates[0].url_context_metadata}")
    print(f"📝 Writing to important_info/{file_url}.txt")
    with open(f"important_info/{file_url}.txt", "w") as f:
        f.write(f"Google search results: {search_response.text}")

for file in os.listdir(f"important_info/"):
    
    with open(f"important_info/{file}", "r") as info_file:
        important_info = info_file.read()
    filename = file.replace("_", "/").split(".txt")[0]
    evaluator = Evaluator(file, client)
    snippets = evaluator.scrape_context7()
    print(snippets)

    # ### Placeholder for better evaluation method ###
    # score = evaluator.evaluate(important_info, snippets)
    # print(f"📊 Score breakdown for {filename}: {score.text}")
    # print("--------------------------------")