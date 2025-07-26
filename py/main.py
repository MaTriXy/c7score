import os
from dotenv import dotenv_values
from google import genai
import argparse
from github import Github, Auth
from search import Search
from evaluator import Evaluator
from utils import scrape_context7_snippets

env_config = dotenv_values(".env")

client = genai.Client(api_key=env_config["GEMINI_API_TOKEN"])
auth = Auth.Token(env_config["GITHUB_TOKEN"])
g = Github(auth=auth)


def context_evaluation(library, source_url, snippet_url):
    search = Search(library, client)
    generated_questions = search.generate_questions()
    search_topics = search.generate_search_topics(generated_questions)
    context = search.fetch_context(search_topics, library)
    context_scores, context_avg_score, context_explanations = search.evaluate_context(generated_questions, context)
    library_file = library.replace("/", "\\")
    with open(f"py/context_evaluation/{library_file}.txt", "a") as f:
        f.write(f"Scores: {context_scores}\nExplanations: {context_explanations}")

    print(f"📊 Scoring ...")
    other_messages = []

    snippets = scrape_context7_snippets(snippet_url)
    evaluator = Evaluator(client, snippets)

    ## Evaluation tests ##

    llm_score_breakdown, llm_score, llm_explanation = evaluator.llm_evaluate()
    print(f"📋 LLM Score breakdown: {llm_score_breakdown}")
    print(f"📊 Snippets are unique, clear, and syntactically correct {source_url}: {llm_score}")

    format_score, format_explanation = evaluator.formatting()
    print(f"📋 Formatting score: {format_score}")
    other_messages.append(f"Snippets are complete and formatted correctly: {format_score}, {format_explanation}")

    project_metadata_score, project_metadata_explanation = evaluator.project_metadata()
    print(f"📋 Project metadata score: {project_metadata_score}")
    other_messages.append(f"Snippets are free from project metadata: {project_metadata_score}, {project_metadata_explanation}")

    initialization_score, initialization_explanation = evaluator.initialization()
    print(f"📋 Initialization score: {initialization_score}")
    other_messages.append(f"Snippets do not contain unnecessary initialization info: {initialization_score}, {initialization_explanation}")

    average_score = ((context_avg_score + llm_score + format_score + project_metadata_score + initialization_score) / 7)
    print(f"✅ Total quality score: {average_score} ✅\n")
    average_llm_score = (llm_score / 3)
    return average_score, context_scores, context_avg_score, context_explanations, average_llm_score, llm_score_breakdown, llm_explanation, other_messages

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str, required=True, help="URL of source (Github repo, docs, llms.txt, etc.)")
    parser.add_argument("--snippet", type=str, required=True, help="URL of context7 snippets")
    args = parser.parse_args()

    source_url = args.url
    snippet_url = args.snippet
    return source_url, snippet_url

def main():
    source_url, snippet_url = parse_args()
    context_evaluation(source_url, snippet_url)

if __name__ == "__main__":
    main()