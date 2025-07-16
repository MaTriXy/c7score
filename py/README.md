# Snippet Evaluator

1. Given a Github repo URL, prompt an LLM to find the top 10 most critical pieces of information. This information can be code snippets or examples. `search.py`
2. Search the parsed code snippets (found on the Context7 website), and make sure that the important information is contained in them. `evaluator.py`

## Search
Uses Gemini model paired with tool-calling to determine the most important information about a library. The tools used are Google search and URL context (retrives the content from a link either provided in the prompt or found via Google Search). This effectively combines the scraping the provided url and retrieving contextual information outside of the link provided.

## Evaluator
Scrapes corresponding file snippets from context7.com and compares them to the important information found in `search.py`.

Ideas for tests:
* Are the snippets relevant, sensible, and free of errors -> `llm_evaluate`
* Are any of the categories in a snippet missing? -> `snippet_complete`
* Are any code snippets very short? Too short or too long could indicate unhelpful docs or information such as directory structure or lists -> `code_snippet_length`
* Are there multiple code snippets in a snippet? -> `multiple_code_snippets`
* Are the languages actually descriptions (e.g., "FORTE Build System Configuration", "CLI Arguments")? Or none or console output? (e.g., pretty-printed tables, etc.) -> `language_checker`
* check if code is just a list or a general description for an argument (would have - or numbered list). Shell and bash commands have these, which are acceptable. -> `contains_list`
* check if there are bibtex citations (would have language tag Bibtex) -> `bibtex_citations`
* Are any of the snippets about licensing -> `license_check`
* Are any of the snippets just the directory structure -> `directory_structure`
* Are any of the snippets just imports? (e.g. import, require, etc.) -> `imports`
* Are any of the snippets just installations? (e.g. pip install, etc.) -> `installs`


## Running it

Create a `.env` file with GITHUB_TOKEN and GEMINI_API_TOKEN. 

Use `main.py --url URL --snippet SNIPPET_URL`. The `--url` expects the original source url that is to be converted into snippets. The `--snippet` expects the context7 url to the snippets. 

An example of this is:


`python main.py --url https://biopython.org/wiki/Documentation --snippet https://context7.com/context7/biopython_org-wiki-documentation/llms.txt`


