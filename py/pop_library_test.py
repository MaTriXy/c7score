import re
from playwright.sync_api import Page, expect, sync_playwright
import pandas as pd
from main import run_evaluation

def get_pop_libraries() -> list[str]:
    """Gets the top 100 libraries from Context7"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = "https://context7.com/stats"
        page.goto(url, wait_until="domcontentloaded")
        page.click("text=All Time")
        rows = page.locator("table tbody tr").evaluate_all("(rows) => rows.map(r => r.innerText.trim())")
        libraries = [row.split('\t')[0] for row in rows]
        browser.close()
        return libraries

def get_library_urls(libraries: list[str]) -> dict[str, str]:
    """Gets the source and snippet URLs for each library"""
    library_urls = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for library in libraries:
            url = f"https://context7.com{library}"
            page.goto(url, wait_until="domcontentloaded")
            source_url = page.locator("a[href^='https://']").nth(1).get_attribute("href")  # Second link on webpage
            library_urls[library] = (source_url, f"{url}/llms.txt")  # key is source URL, value is snippet URL
    return library_urls

def main():
    """Runs the evaluation for each library and saves the results to a CSV file
    The CSV file has the following columns:
    - library: the name of the library
    - score: the average score of the library across 19 tests
    - llm_explanation: the explanation of the LLM's score
    - other_messages: a breakdown of what each static analysis score means
    """
    df = pd.DataFrame(columns=["library", "overall_score", "llm_score", "llm_explanation", "other_messages"])
    print("Getting libraries from Context7...")
    libraries = get_pop_libraries()
    print("Getting library URLs...")
    library_urls = get_library_urls(libraries)
    print("Running evaluation...")
    for library, (source_url, snippet_url) in library_urls.items():
        print(f"Working on {library}...")
        score, llm_score, llm_explanation, other_messages = run_evaluation(source_url, snippet_url)
        other_messages_str = "\n\n".join(other_messages)
        df.loc[len(df)] = [library, score, llm_score, llm_explanation, other_messages_str]
    df.to_csv("py/library_scores.csv", index=False)

if __name__ == "__main__":
    main()