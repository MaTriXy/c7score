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
    """Evaluates the context of the library using 5 metrics"""
    search = Search(library, client)
    generated_questions = search.generate_questions()
    search_topics = search.generate_search_topics(generated_questions)
    context = search.fetch_context(search_topics, snippet_url)
    context_scores, context_avg_score, context_explanations = search.evaluate_context(generated_questions, context)
    print(f"📋 Context scores: {context_scores}")
    print(f"📋 Context average score: {context_avg_score}")
    print(f"📋 Context explanations: {context_explanations}")
    formatted_explanations = "\n".join(context_explanations)
    library_file = library.replace("/", "\\")
    with open(f"py/context_evaluation/{library_file}.txt", "w") as f:
        f.write(f"Generated questions: {generated_questions}\n\nScores per question: {context_scores}\n\nAverage of question scores: {context_avg_score}\n\nExplanations: {formatted_explanations}")

    print(f"📊 Scoring ...")
    other_messages = []

    snippets = scrape_context7_snippets(snippet_url)
    evaluator = Evaluator(client, snippets)

    llm_avg_score, llm_explanation = evaluator.llm_evaluate()
    print(f"📊 Snippets are unique, clear, and syntactically correct {source_url}: {llm_avg_score}")

    format_score, format_explanation = evaluator.formatting()
    print(f"📋 Formatting score: {format_score}")
    other_messages.append(f"Snippets are complete and formatted correctly: {format_score}, {format_explanation}")

    project_metadata_score, project_metadata_explanation = evaluator.project_metadata()
    print(f"📋 Project metadata score: {project_metadata_score}")
    other_messages.append(f"Snippets are free from project metadata: {project_metadata_score}, {project_metadata_explanation}")

    initialization_score, initialization_explanation = evaluator.initialization()
    print(f"📋 Initialization score: {initialization_score}")
    other_messages.append(f"Snippets do not contain unnecessary initialization info: {initialization_score}, {initialization_explanation}")

    weights = {"context": 0.25, "llm": 0.25, "format": 0.25, "metadata": 0.125, "initialization": 0.125}
    average_score = sum(weights[key] * value for key, value in {"context": context_avg_score, "llm": llm_avg_score, "format": format_score, "metadata": project_metadata_score, "initialization": initialization_score}.items())
    print(f"✅ Total quality score: {average_score} ✅\n")
    return average_score, context_scores, context_avg_score, context_explanations, llm_avg_score, llm_explanation, other_messages

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", type=str, required=True, help="library name")
    parser.add_argument("--url", type=str, required=True, help="URL of source (Github repo, docs, llms.txt, etc.)")
    parser.add_argument("--snippet", type=str, required=True, help="URL of context7 snippets")
    args = parser.parse_args()

    library = args.library
    source_url = args.url
    snippet_url = args.snippet
    return library, source_url, snippet_url

def main():
    library, source_url, snippet_url = parse_args()
    context_evaluation(library, source_url, snippet_url)

if __name__ == "__main__":
    main()