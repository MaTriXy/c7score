# `context-trace`

The `context-trace` package is used to evaluate the quality of Upstash's Context7 MCP snippets.

## Metrics
`context-trace` uses the following five metrics to grade quality. The metrics can be divided into two groups: LLM analysis and static analysis.
1. LLM Analysis
    * Metric 1 (Question-Snippet Comparison): How well the snippets answer common developer questions.
    * Metric 2 (LLM substitute for human eval): Evaluates snippet relevancy, clarity, and correctness. 
2. Static Analysis
    * Metric 3 (Formatting): Determines whether the snippets have the expected format. 
    * Metric 4 (Project Metadata): Checks for irrelevant project information.
    * Metric 5 (Initialization): Looks for basic import and installation statements.

## Usage
**Requirements:** .env file that contains a `GEMINI_API_TOKEN`, `GITHUB_API_TOKEN`, and `CONTEXT7_API_TOKEN`.

```
var contextTrace = require("@shannonrumsey/context-trace") 

contextTrace.getScore(
    "/facebook/react", 
    { 
    report: 
        {
            console: true,
            folderPath: `${__dirname}/../results`
        },
    weights: 
        {
            question: 0.8,
            llm: 0.05,
            formatting: 0.05,
            metadata: 0.025,
            initialization: 0.025,
        }
    prompt:
        {
            questionEvaluation: `
                                You are evaluating documentation context for its quality and relevance in helping an AI 
                                coding assistant answer the following question:

                                Questions: {{questions}}

                                Context: {{contexts}}

                                For each question, evaluate and score the context from 0-100 based on the following criteria:
                                1. Relevance to the specific question (50%)
                                2. Code example quality and completeness (25%)
                                3. Practical applicability (15%)
                                4. Coverage of requested features (10%)

                                Your response should contain a list of scores, one average score, and one explanation for each score.
                                `
        }
    }
);


contextTrace.compareLibraries(
    "/tailwindlabs/tailwindcss.com",
    "/context7/tailwindcss",
    {
    report:
            {
                console: true
            }
    llm:
        {
            temperature: 0.95,
            topP: 0.8,
            topK: 45
        }
    prompt:
        {   
            questionEvaluation: `
                                You are evaluating two different documentation contexts for their quality and relevance in helping an AI 
                                coding assistant answer the following question:

                                Questions: {{questions}}

                                Contexts ({{contexts[0]}} and {{contexts[1]}}):

                                For each question, evaluate and score the context from 0-100 based on the following criteria:
                                1. Relevance to the specific question (40%)
                                2. Code example quality and completeness (25%)
                                3. Practical applicability (15%)
                                4. Coverage of requested features (15%)
                                5. Clarity and organization (5%)

                                Your response should contain one list that contains two sublists for each context (4 in total), where the first sublist represents 
                                your responses for the first context and the second sublist represents your responses for the second context. 
                                Each sublist should have two sublists, where the first sublist represents the scores for each question,
                                and should have 15 elements. The second sublist represents the correspond explanations for each score,
                                and should also have 15 elements. Each context will return an average score, with a total of 2 average scores.
                                `
        }
    }
);
```

### Configuration
```
{
    report: 
        {
            console: boolean
            folderPath: string
        } 
    weights: 
        {
            question: number,
            llm: number,
            formatting: number,
            metadata: number,
            initialization: number
        } 
    llm:
        {
            temperature: number,
            topP: number,
            topK: number,
        }
    prompt:
        {
            searchTopics: string,
            questionEvaluation: string,
            llmEvaluation: string
        }
}
```

**Notes**
* `getScore` only takes in one library whereas `compareLibraries` takes in two and they must have the same product.
* `console: true` prints results to the console, and `folderPath` specifies if and which folder the human-readable and machine-readable results are written to (the folder must already exist).
    * `getScore` will output machine-readable results to `result.json` and human-readable results to `result-LIBRARY_NAME.txt` in the specified directory, and `compareLibraries` will output them to `result-compare.json` and `result-compare-LIBRARY_NAME.txt`
    * The machine-readable file will add or update the libraries.
* The prompt options replace the current prompts. It is not recommended to change the final output result instructions or score maximum (e.g., 100 -> 10). The search prompt will only be in effect when the questions don't already exist on the c7score repo. Each prompt accepts different placeholders, but they must be formatted as {{variableName}} with the correct associated variable name in the prompt. 
    * searchTopics -> {{product}} and {{questions}}
    * context -> {{contexts}} and {{questions}} for `getScore`, {{contexts[0]}}, {{contexts[1]}}, and {{questions}} for `compareLibraries`
    * llmEvaluation -> {{snippets}} and {{snippetDelimiter}}, {{snippets[0]}}, {{snippets[1]}}, and {{snippetDelimeter}} for `compareLibraries`

**Defaults** (No changes to prompts, no writing to files)

    {
    report: 
        {
            console: true
        } 
    weights: 
        {
            question: 0.8,
            llm: 0.05,
            formatting: 0.05,
            metadata: 0.025,
            initialization: 0.025
        } 
    llm:
        {
            temperature: 1.0,
            topP: 0.95,
            topK: 64,
        }
    }

## CLI Usage

```
context-trace getscore "/facebook/react" -c '{
    "report":
        {
            "console": true,
            "folderPath": "./results"
        },
    "weights":
        {
            "question": 0.8,
            "llm": 0.05,
            "formatting": 0.05,
            "metadata": 0.025,
            "initialization": 0.025 
        },
    "prompts":
        {
            "searchTopics": "For each question about {{product}}, generate 5 topics that should help find the most relevant documentation and code examples. Here are the questions: {{questions}}"
        }
}'


context-trace comparelibraries "/tailwindlabs/tailwindcss.com" "/context7/tailwindcss" -c '{
    "report": 
        {
            "console": true
        },
    "llm": 
        {
            "temperature": 0.0,
            "topP": 0.95,
            "topK": 40
        }
}'
```