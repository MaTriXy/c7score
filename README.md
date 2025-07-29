# Snippet Evaluator (Python version: Done, TS: WIP)

Before running any of the files, create an `.env` file with GITHUB_TOKEN and GEMINI_API_TOKEN. 


## Search `search.ts` **DONE**
Given a source URL, prompt an LLM to determine 15 common questions a developer might ask about a library. This information can be code snippets or examples. Uses Gemini model paired with Google Search tool-calling to determine the most important information about a library. Using the questions, an LLM generates topics which can be used to retrieve the relevant context7 code snippets. The retrieved snippets are rated based on how well they answer the questions.

## Evaluator `evaluator.ts` **WIP**
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

## Test `tester.ts` **WIP**

To run the `tester.ts` file, use:
    `npm run test -- test`

## Running it on any file `main.ts` **WIP**

1. Use `npm install` to install all the dependencies.

2. Use `npx ts-node main.ts --url URL --snippet SNIPPET_URL`. The `--url` expects the original source URL that is to be converted into snippets. The `--snippet` expects the context7 URL to the snippets.

    An example of this is:

    `npx ts-node src/main.ts --library /vercel/next.js --url https://github.com/vercel/next.js --snippet https://context7.com/vercel/next.js/llms.txt`
