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
    }
);


contextTrace.compareLibraries(
    "/tailwindlabs/tailwindcss.com",
    "/context7/tailwindcss",
    {
    llm:
        {
            temperature: 0.95,
            topP: 0.8,
            topK: 45
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
        context: number,
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
}
```

**Notes**
* `getScore` only takes in one library whereas `compareLibraries` only takes in two.
* `console: true` prints results to the console, and `folderPath` specifies if and which folder the human-readable and machine-readable results are written to (the folder must already exist).
    * `getScore` will output machine-readable results to `result.json` and human-readable results to `result-LIBRARY_NAME.txt` in the specified directory, and `compareLibraries` will output them to `result-compare.json` and `result-compare-LIBRARY_NAME.txt`
    * The machine-readable file will add or update the libraries.

**Defaults**

    {
    report: 
        {
            console: true
        } 
    weights: 
        {
            context: 0.8,
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