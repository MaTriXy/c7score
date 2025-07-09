# Snippet Evaluator

1. Given a Github repo URL, prompt an LLM to find the top 10 most critical pieces of information. This information can be code snippets or examples. `search.py`
2. Search the parsed code snippets (found on the Context7 website), and make sure that the important information is contained in them. `evaluator.py`

## Info Selector (ARCHIVED)
Uses Github API to retreive all text-based files from a Github Repo, given a provided URL. The files are fed into an LLM, which determines the 10 most important pieces of information.

## Search
Uses Gemini model paired with tool-calling to determine the most important information about a library. The tools used are Google search and URL context (retrives the content from a link either provided in the prompt or found via Google Search). This effectively combines the Github scraping approach from info_selector.py and retrieving contextual information outside of the link provided.

## Evaluator
Scrapes corresponding file snippets from context7.com and compares them to the important information found in `search.py`.

Ideas for tests:
* Percentage of snippets that are not empty
* Percentage of snippets that contain title, description, language, source, and code
* Using PyGithub to retrieve the top 10 most important files from the github
* N-gram overlap between important information and snippets (e.g., BLEU, ROUGE, METEOR)
* Compute embedding similarity between important information and snippets (e.g., BERTScore)
* MAUVE score

## Running it all

Create a `.env` file with GITHUB_TOKEN and GEMINI_API_TOKEN. 

Use `main.py --url URLS` to run both the info selector and evaluator on one or multiple URLs. 

An example of this is:


`python main.py --url https://nextjs.org/docs https://github.com/vercel/next.js`


