import re
from playwright.sync_api import Page, expect, sync_playwright
import pandas as pd
from main import context_evaluation
import httpx
import json
import sys

def get_pop_libraries() -> list[str]:
    """Gets the top 100 libraries from Context7"""
    with open("py/context7_api_stats.json", "r") as f:
        json_data = json.load(f)
    libraries = json_data["data"]
    libraries_by_pop = {key: sum(value.values()) for key, value in libraries.items()}
    pop_libraries = dict(sorted(libraries_by_pop.items(), key=lambda x: x[1], reverse=True))
    top_pop_libraries = [tup[0] for tup in list(pop_libraries.items())[:100]]
    return top_pop_libraries

def get_library_urls(top_pop_libraries: list[str]) -> dict[str, str]:
    """Gets the source and snippet URLs for each library"""
    with open("py/context7_api_libraries.json", "r") as f:
        json_data = json.load(f)
    library_urls = {library["settings"]["project"]: (library["settings"]["docsRepoUrl"], f'https://context7.com{library["settings"]["project"]}/llms.txt') for library in json_data if library["settings"]["project"] in top_pop_libraries}
    return library_urls

def main():
    """Runs the evaluation for each library and saves the results to a CSV file
    The CSV file has the following columns:
    - library: the name of the library
    - context_scores: the scores of the context evaluation (on 15 questions)
    - context_average_score: the average score of the context evaluation
    - context_explanations: the explanations of the context evaluation (on 15 questions)
    - average_score: the average score of the library across 19 tests
    - llm_score: the score of the LLM's score
    - llm_score_breakdown: the breakdown of the LLM's score
    - llm_explanation: the explanation of the LLM's score
    - other_messages: a breakdown of what each static analysis score means
    """
    df = pd.DataFrame(columns=["library", "overall_score", "llm_score", "llm_score_breakdown (score per criterion)", "llm_explanation", "other_messages"])
    # print("Getting libraries from Context7...")
    # top_pop_libraries = get_pop_libraries()
    # print("Getting library URLs...")
    # library_urls = get_library_urls(top_pop_libraries)
    library_urls = {
        "/context7/tailwindcss": ("https://tailwindcss.com/docs/installation/using-vite", "https://context7.com/context7/tailwindcss/llms.txt"),
        "/tailwindlabs/tailwindcss.com": ("https://github.com/tailwindlabs/tailwindcss.com", "https://context7.com/tailwindlabs/tailwindcss.com/llms.txt")
    }
    print("Running evaluation...")
    for library, (source_url, snippet_url) in library_urls.items():
        try:
            print(f"Working on {library}...")
            average_score, context_scores, context_average_score, context_explanations, average_llm_score, llm_score_breakdown, llm_explanation, other_messages = context_evaluation(library, source_url, snippet_url)
            other_messages_str = "\n\n".join(other_messages)
            df.loc[len(df)] = [library, context_scores, average_score, context_average_score, context_explanations, average_score, average_llm_score, llm_score_breakdown, llm_explanation, other_messages_str]

        # Caused by error messages sent from server (e.g., rate limiting, internal server error)
        except httpx.HTTPStatusError as e:
            print(f"HTTPStatusError: {e}")
            break

        # All other possible errors
        except Exception as e:
            print(f"{library} error: {e}. Skipping...")
            continue

        # Regardless of errors, save what we have
        finally:
            df.to_csv("py/library_scores.csv", index=False)


if __name__ == "__main__":
    main()
