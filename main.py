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

    llm_score, llm_total = evaluator.llm_evaluate(important_info)
    print(f"📋 LLM Score breakdown: {llm_score}")
    print(f"📊 Snippets contain important info and syntactically correct {url}: {llm_total}")

    snippet_complete = evaluator.snippet_complete()
    print(f"📊 Snippets contain all the required components: {snippet_complete}")

    code_snippet_length = evaluator.code_snippet_length()
    print(f"📊 Code snippets contain meaningful information: {code_snippet_length}")

    multiple_code_snippets = evaluator.multiple_code_snippets()
    print(f"📊 Each snippet has only one code snippet: {multiple_code_snippets}")

    language_checker = evaluator.language_desc()
    print(f"📊 Languages are proper and not just descriptions or console outputs: {language_checker}")

    contains_list = evaluator.contains_list()
    print(f"📊 APIDOC code is not just a list: {contains_list}")

    bibtex_citations = evaluator.bibtex_citations()
    print(f"📊 Snippets contain bibtex citations: {bibtex_citations}")

    license_info = evaluator.license_info()
    print(f"📊 Snippets contain license information: {license_info}")

    directory_structure = evaluator.directory_structure()
    print(f"📊 Snippets contain directory structure: {directory_structure}")

    imports = evaluator.imports()
    print(f"📊 Snippets contain imports: {imports}")

    installs = evaluator.installs()
    print(f"📊 Snippets contain installations: {installs}")

    print(f"✅ Total quality score: {(llm_total + snippet_complete + code_snippet_length + multiple_code_snippets + language_checker + contains_list + bibtex_citations + license_info + directory_structure + imports + installs) / 90} ✅")



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str, required=True, help="URL of source (Github repo, docs, llms.txt, etc.)")
    parser.add_argument("--snippet", type=str, required=True, help="URL of context7 snippets")
    args = parser.parse_args()

    url = args.url
    snippet_url = args.snippet

    # create_file(url)
    score_file(url, snippet_url)


if __name__ == "__main__":
    main()