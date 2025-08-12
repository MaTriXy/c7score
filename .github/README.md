# Context7's Code Snippet Evaluator

Before running any of the files, create an `.env` file with CONTEXT7_API_TOKEN, GITHUB_API_TOKEN, and GEMINI_API_TOKEN. 

## Search `search.ts`
Given a source URL, prompt an LLM to determine 15 common questions a developer might ask about a library. This information can be code snippets or examples. Uses Gemini model paired with Google Search tool-calling to determine the most important information about a library. Using the questions, an LLM generates topics which can be used to retrieve the relevant context7 code snippets. The retrieved snippets are rated based on how well they answer the questions.

## LLM Eval `llmEval.ts`
Uses an LLM to evaluate qualities that cannot be automated. This includes checking that the snippets contain unique information, are syntactically correct, and are clear. 

## Static Metrics `staticEval.ts`
* `formatting`
    * Are any of the categories in a snippet missing?
    * Are any code snippets very short? Too short or too long could indicate unhelpful docs or information such as directory structure or lists
    * Are the languages actually descriptions (e.g., "FORTE Build System Configuration", "CLI Arguments")? Or none or console output? (e.g., pretty-printed tables, etc.)
    * check if code is just a list or a general description for an argument (indicated by a numbered or bulleted list)
* `project_metadata`
    * check if there are bibtex citations (would have language tag Bibtex)
    * Are any of the snippets about licensing
    * Are any of the snippets just the directory structure
* `initializations`
    * Are any of the snippets just imports? (e.g. import, require, etc.)
    * Are any of the snippets just installations? (e.g. pip install, etc.)

## Tests

To run tests on individual evaluation: `individualTester.ts`

    USE_MANUAL=True npm run test-individual

* **USE_MANUAL=True** will only test on the specified libraries (individually)
* **USE_MANUAL=False** will test on 100 most popular libraries from `https://context7.com/stats`

To run tests on comparison evaluation: `compareTester.ts`

    npm run test-compare


To check that the static evaluation metrics work as expected: `staticTester.ts`

    npm run test-static

**Note:** the static test may become out-of-date when libraries are refreshed.