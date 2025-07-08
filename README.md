# Snippet Evaluator

This is a very basic implementation.

1. Given a Github repo URL, prompt an LLM to find the top 10 most critical pieces of information. This information can be code snippets or examples. `info_selector.py`
2. Search the parsed code snippets (found on the Context7 website), and make sure that the important information is contained in them. `evaluator.py`

### Info Selector
Uses Github API to retreive all text-based files from a Github Repo, given a provided URL. The files are fed into an LLM, which determines the 10 most important pieces of information.

**TODO:** Fix method of using Github API so that it's faster. Currently making one request per file, but should make one request per repo. Clean up outputs of LLM. PyGithub also has a feature that returns the top 10 most popular files, which could be interesting to compare to the snippets that the LLM deems important. Need to rework LLM prompt, currently determines things like file structure as important. Could try few-shot prompting.

### Evaluator
Scrapes corresponding file snippets from context7.com and compares them to the 10 most important pieces of information (found in info_selector.py).  

**TODO:** Replace current evaluator with an improved method (e.g., sophisticated matching, an LLM with proper few-shot examples, etc.). Currently using an LLM as a placeholder evaluation method to ensure pipeline works. 

## Running it all

Create a `.env` folder with GITHUB_TOKEN and GEMINI_API_TOKEN. 

To give execute permissions:

`chmod +x run.sh`, then use `./run.sh URLs` to run both the info selector and evaluator on one or multiple URLs. 

An example of this is:


`./run.sh https://github.com/jdan/98.css https://github.com/serafimcloud/21st`
