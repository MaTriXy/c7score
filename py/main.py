import os
from dotenv import dotenv_values
from google import genai
import argparse
from google.genai import types
from github import Github, Auth
from search import Search
from evaluator import Evaluator
from utils import scrape_context7_snippets

env_config = dotenv_values(".env")

client = genai.Client(api_key=env_config["GEMINI_API_TOKEN"])
auth = Auth.Token(env_config["GITHUB_TOKEN"])
g = Github(auth=auth)

# Context tool
url_context_tool = types.Tool(url_context=types.UrlContext())
model_config = types.GenerateContentConfig(tools=[url_context_tool],
                                           response_modalities=["TEXT"])

def create_file(url):
    print(url)
    search = Search(url, client, model_config)
    search_response = search.relevant_info()
    # Gemini has bug where it sometimes returns None or cant access the URL
    # https://github.com/googleapis/python-genai/issues/1039
    # https://discuss.ai.google.dev/t/does-url-context-even-work-can-you-fix-it/91770

    # Retry to avoid None (caused by tool call)
    retry_count = 0
    errors = search_response == None or "I am sorry" in search_response
    while errors and retry_count < 5:  
        search_response = search.relevant_info()
        retry_count += 1

    if errors:
        print("Failed to access URL after retry")

    file_url = url.replace("/", "\\")
    with open(f"py/important_info/{file_url}.txt", "w") as f:
        f.write(f"Google search results: {search_response}")

def score_file(url, snippet_url):
    file = url.replace("/", "\\")
    print(f"📊 Scoring ...")
    other_messages = []
    with open(f"py/important_info/{file}.txt", "r") as info_file:
        important_info = info_file.read()

    snippets = scrape_context7_snippets(snippet_url)
    evaluator = Evaluator(client, snippets)

    ## Evaluation tests ##

    llm_score_breakdown, llm_score, llm_explanation = evaluator.llm_evaluate(important_info)
    print(f"📋 LLM Score breakdown: {llm_score_breakdown}")
    print(f"📊 Snippets contain required info, clear, and syntactically correct {url}: {llm_score}")

    format_score, format_explanation = evaluator.formatting()
    print(f"📋 Formatting score: {format_score}")
    other_messages.append(f"Percentage of code snippets with correct formatting: {format_score}, {format_explanation}")

    project_metadata_score, project_metadata_explanation = evaluator.project_metadata()
    print(f"📋 Project metadata score: {project_metadata_score}")
    other_messages.append(f"Percentage of code snippets with project metadata info: {project_metadata_score}, {project_metadata_explanation}")

    initialization_score, initialization_explanation = evaluator.initialization()
    print(f"📋 Initialization score: {initialization_score}")
    other_messages.append(f"Percentage of code snippets with initialization info: {initialization_score}, {initialization_explanation}")

    average_score = ((llm_score + format_score + project_metadata_score + initialization_score) / 6)
    print(f"✅ Total quality score: {average_score} ✅\n")
    average_llm_score = (llm_score / 3)
    return average_score, average_llm_score, llm_score_breakdown, llm_explanation, other_messages

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str, required=True, help="URL of source (Github repo, docs, llms.txt, etc.)")
    parser.add_argument("--snippet", type=str, required=True, help="URL of context7 snippets")
    args = parser.parse_args()

    url = args.url
    snippet_url = args.snippet
    return url, snippet_url

def run_evaluation(url, snippet_url):
    # create_file(url)
    average_score, llm_score, llm_score_breakdown, llm_explanation, other_messages = score_file(url, snippet_url)
    return average_score, llm_score, llm_score_breakdown, llm_explanation, other_messages

def main():
    url, snippet_url = parse_args()
    run_evaluation(url, snippet_url)

if __name__ == "__main__":
    main()