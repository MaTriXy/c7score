import pandas as pd
from main import context_evaluation
import httpx
import json
import os

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
    manual_libraries = os.getenv("USE_MANUAL", "False")
    if manual_libraries == "True":
        library_urls = {
        "/context7/tailwindcss": ("https://tailwindcss.com/docs/installation/using-vite", "https://context7.com/context7/tailwindcss/llms.txt"),
        "/tailwindlabs/tailwindcss.com": ("https://github.com/tailwindlabs/tailwindcss.com", "https://context7.com/tailwindlabs/tailwindcss.com/llms.txt")
        }
    else:
        print("Getting libraries from Context7...")
        top_pop_libraries = get_pop_libraries()
        print("Getting library URLs...")
        library_urls = get_library_urls(top_pop_libraries)

    df = pd.DataFrame(columns=["Library", "Overall Avg Score", "Context Scores Breakdown", "Context Avg Score", "Context Explanations", "LLM Avg Score", "LLM Explanation", "Other Messages"])
    
    print("Running evaluation...")
    for library, (source_url, snippet_url) in library_urls.items():
        try:
            print(f"Working on {library}...")
            average_score, context_scores, context_average_score, context_explanations, llm_avg_score, llm_explanation, other_messages = context_evaluation(library, source_url, snippet_url)
            other_messages_str = "\n\n".join(other_messages)
            df.loc[len(df)] = [library, average_score, context_scores, context_average_score, context_explanations, llm_avg_score, llm_explanation, other_messages_str]

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
