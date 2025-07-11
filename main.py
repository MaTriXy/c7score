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

# Web search tool
grounding_tool = types.Tool(google_search=types.GoogleSearch())
url_context_tool = types.Tool(url_context=types.UrlContext())
model_config = types.GenerateContentConfig(tools=[grounding_tool, url_context_tool],
                                           response_modalities=["TEXT"])

def create_file(url):
    search = Search(url, client, model_config)
    search_response = search.google_search()
    generated_context = search_response.candidates[0].url_context_metadata
    # Gemini has bug where it sometimes returns None
    # https://github.com/googleapis/python-genai/issues/1039
    if not generated_context:
        # Retry generation
        search_response = search.google_search()

    file_url = url.replace("/", "\\")
    with open(f"important_info/{file_url}.txt", "w") as f:
        f.write(f"Google search results: {search_response.text}")

def score_file(url, snippet_url):
    file = url.replace("/", "\\")
    print(f"📊 Scoring ...")
    with open(f"important_info/{file}.txt", "r") as info_file:
        important_info = info_file.read()

    snippets = scrape_context7_snippets(snippet_url)
    evaluator = Evaluator(client, snippets)

    ## Evaluation tests ##

    # Checks if the snippets are relevant to the important info
    # llm_score, llm_total = evaluator.llm_evaluate(important_info)
    # print(f"📋 LLM Score breakdown: {llm_score}")
    # print(f"📊 Snippets contain important info and syntactically correct {url}: {llm_total}")

    # Checks if all the required components are present and not empty in each snippet
    completion_score = evaluator.completion_evaluate()
    print(f"📊 Snippets are complete and with code: {completion_score}")

    # Checks if any snippets are just about error messages
    error_snippet = evaluator.error_snippet()
    print(f"📊 Snippets are not just about error messages: {error_snippet}")

    # Checks if the code snippets are short
    code_snippet_length = evaluator.code_snippet_length()
    print(f"📊 Code snippets contain meaningful information: {code_snippet_length}")

    # Checks if there are multiple code snippets in a snippet
    multiple_code_snippets = evaluator.multiple_code_snippets()
    print(f"📊 Each snippet has only one code snippet: {multiple_code_snippets}")

    # Checks if the languages aren't proper languages
    language_checker = evaluator.language_checker()
    print(f"📊 Languages are proper languages: {language_checker}")

    

    print(f"✅ Total quality score: {(int(completion_score) + int(error_snippet) + int(code_snippet_length)) / 4} ✅")



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str, required=True, help="URL of source (Github repo, docs, llms.txt, etc.)")
    parser.add_argument("--snippet", type=str, required=True, help="URL of context7 snippets")
    args = parser.parse_args()

    url = args.url
    snippet_url = args.snippet

    create_file(url)
    score_file(url, snippet_url)


if __name__ == "__main__":
    main()