# `context-trace`

The `context-trace` package is used to evaluate the quality of Upstash's Context7 MCP snippets.

## Metrics
`context-trace` uses the following five metrics to grade quality. The metrics can be divided into two groups: LLM analysis and rule-based text analysis.
1. LLM Analysis
    * Metric 1 (Question-Snippet Comparison): How well the snippets answer common developer questions.
    * Metric 2 (LLM substitute for human eval): Evaluates snippet relevancy, clarity, and correctness. 
2. Text Analysis
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
                    You are evaluating documentation 
                    ...
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
                    You are evaluating two different 
                    documentation contexts ...
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
            "searchTopics": "For each question ..."
        }
}'


context-trace \ 
    comparelibraries \ 
    "/tailwindlabs/tailwindcss.com" \ 
    "/context7/tailwindcss" -c '{
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