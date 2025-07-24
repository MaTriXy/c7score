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
    # Gemini has bug where it sometimes returns None
    # https://github.com/googleapis/python-genai/issues/1039

    if search_response == None:
        # Retry generation
        search_response = search.google_search()

    file_url = url.replace("/", "\\")
    with open(f"py/important_info/{file_url}.txt", "w") as f:
        f.write(f"Google search results: {search_response.text}")

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
    print(f"📊 Snippets contain important info and syntactically correct {url}: {llm_score}")

    snippet_complete, snippet_complete_explanation = evaluator.snippet_complete()
    print(f"📊 Snippets contain all the required components: {snippet_complete}")
    other_messages.append(f"Percentage of required components satisfied (represented as score out of 10): {snippet_complete}, {snippet_complete_explanation}")

    code_snippet_length, code_snippet_length_explanation = evaluator.code_snippet_length()
    print(f"📊 Code snippets contain meaningful information: {code_snippet_length}")
    other_messages.append(f"Percentage of code snippets with appropriate length: {code_snippet_length}, {code_snippet_length_explanation}")

    multiple_code_snippets, multiple_code_snippets_explanation = evaluator.multiple_code_snippets()
    print(f"📊 Each snippet has only one code snippet: {multiple_code_snippets}")
    other_messages.append(f"Percentage of code snippets that contain one language and code section: {multiple_code_snippets}, {multiple_code_snippets_explanation}")

    language_checker, language_checker_explanation = evaluator.language_desc()
    print(f"📊 Languages are proper and not just descriptions or console outputs: {language_checker}")
    other_messages.append(f"Percentage of code snippets that are not just descriptions or console outputs: {language_checker}, {language_checker_explanation}")

    contains_list, contains_list_explanation = evaluator.contains_list()
    print(f"📊 APIDOC code is not just a list: {contains_list}")
    other_messages.append(f"Percentage of code snippets that are not just a list: {contains_list}, {contains_list_explanation}")

    bibtex_citations, bibtex_citations_explanation = evaluator.bibtex_citations()
    print(f"📊 Snippets contain bibtex citations: {bibtex_citations}")
    other_messages.append(f"Percentage of code snippets that do not contain bibtex citations: {bibtex_citations}, {bibtex_citations_explanation}")

    license_info, license_info_explanation = evaluator.license_info()
    print(f"📊 Snippets contain license information: {license_info}")
    other_messages.append(f"Percentage of code snippets that do not contain license information: {license_info}, {license_info_explanation}")

    directory_structure, directory_structure_explanation = evaluator.directory_structure()
    print(f"📊 Snippets contain directory structure: {directory_structure}")
    other_messages.append(f"Percentage of code snippets that do not contain directory structure: {directory_structure}, {directory_structure_explanation}")

    imports, imports_explanation = evaluator.imports()
    print(f"📊 Snippets contain imports: {imports}")
    other_messages.append(f"Percentage of code snippets that are not just imports: {imports}, {imports_explanation}")

    installs, installs_explanation = evaluator.installs()
    print(f"📊 Snippets contain installations: {installs}")
    other_messages.append(f"Percentage of code snippets that are not just installations: {installs}, {installs_explanation}")

    average_score = (llm_score + snippet_complete + code_snippet_length + multiple_code_snippets + language_checker + contains_list + bibtex_citations + license_info + directory_structure + imports + installs) / 19
    print(f"✅ Total quality score: {average_score} ✅\n")
    llm_score_out_of_80 = (llm_score / 80) * 10
    return average_score, llm_score_out_of_80, llm_score_breakdown, llm_explanation, other_messages

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str, required=True, help="URL of source (Github repo, docs, llms.txt, etc.)")
    parser.add_argument("--snippet", type=str, required=True, help="URL of context7 snippets")
    args = parser.parse_args()

    url = args.url
    snippet_url = args.snippet
    return url, snippet_url

def run_evaluation(url, snippet_url):
    create_file(url)
    average_score, llm_score, llm_score_breakdown, llm_explanation, other_messages = score_file(url, snippet_url)
    return average_score, llm_score, llm_score_breakdown, llm_explanation, other_messages

def main():
    url, snippet_url = parse_args()
    run_evaluation(url, snippet_url)

if __name__ == "__main__":
    main()