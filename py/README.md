# Snippet Evaluator

Before running any of the files, create an `.env` file with GITHUB_TOKEN and GEMINI_API_TOKEN. 

## Search `search.py`
Given a source URL, prompt an LLM to determine 15 common questions a developer might ask about a library. This information can be code snippets or examples. Uses Gemini model paired with Google Search tool-calling to determine the most important information about a library. Using the questions, an LLM generates topics which can be used to retrieve the relevant context7 code snippets. The retrieved snippets are rated based on how well they answer the questions.

## Evaluator `evaluator.py`
Uses 4 evaluation metrics to rate the snippets. This is performed on snippets up to 1,000 tokens.  

### Metrics
* `llm_evaluate`
    * Are the snippets relevant, sensible, and free of errors
* `formatting`
    * Are any of the categories in a snippet missing?
    * Are any code snippets very short? Too short or too long could indicate unhelpful docs or information such as directory structure or lists
    * Are there multiple code snippets in a snippet?
    * Are the languages actually descriptions (e.g., "FORTE Build System Configuration", "CLI Arguments")? Or none or console output? (e.g., pretty-printed tables, etc.)
    * check if code is just a list or a general description for an argument (indicated by a numbered or bulleted list)
* `project_metadata`
    * check if there are bibtex citations (would have language tag Bibtex)
    * Are any of the snippets about licensing
    * Are any of the snippets just the directory structure
* `initializations`
    * Are any of the snippets just imports? (e.g. import, require, etc.)
    * Are any of the snippets just installations? (e.g. pip install, etc.)

## Test `tester.py`
To test the functionality of the evaluation procedue, you can use the following command:

`USE_MANUAL=True python py/tester.py`
* **USE_MANUAL=True** will only test on the libraries `/context7/tailwindcss` and `/tailwindlabs/tailwindcss.com`
* **USE_MANUAL=False** will test on 100 most popular libraries from `https://context7.com/stats`

It will output the search results in `py/context_evaluation` and the complete evaluation results (search + evaluator) to `py/library_scores.csv`.

Columns in `py/library_scores.csv`:
- library: the name of the library
- average_score: the average score of the library across 5 tests
- context_average_score: the average score of the context evaluation
- context_explanations: the explanations of the context evaluation (on 15 questions)
- llm_avg_score: the average score from llm_evaluate
- llm_explanation: the explanation of the LLM's score
- other_messages: a breakdown of what each static analysis score means

## Running it on any file `main.py`

Use `main.py --library LIBRARY --url URL --snippet SNIPPET_URL`.

An example of this is:

`python main.py --library /vercel/next.js --url https://github.com/vercel/next.js --snippet https://context7.com/vercel/next.js/llms.txt`


