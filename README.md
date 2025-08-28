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
**Requirements:** 

Before running any of the files, create an `.env` file with CONTEXT7_API_TOKEN, GITHUB_API_TOKEN, and GEMINI_API_TOKEN (unless using Vertex AI). If using Vertex AI, the file should include VERTEX_AI, GOOGLE_CLOUD_PROJECT, and GOOGLE_APPLICATION_CREDENTIALS (which is a path to the file containing the credentials).

```typescript
import { getScore, compareLibraries } from "@shannonrumsey/context-trace";

await getScore("/facebook/react", { 
  report: {
    console: true,
    folderPath: `${__dirname}/../results`
  },
  weights: {
    question: 0.8,
    llm: 0.05,
    formatting: 0.05,
    metadata: 0.05,
    initialization: 0.05
  },
  prompts: {
    questionEvaluation: `Evaluate ...`
  }
});

await compareLibraries(
  "/tailwindlabs/tailwindcss.com",
  "/websites/tailwindcss",
  {
    report: {
      console: true
    },
    llm: {
      temperature: 0.95,
      topP: 0.8,
      topK: 45
    },
    prompts: {   
      questionEvaluation: `Evaluate ...`
    }
  }
);
```

### Configuration
```typescript
{
  report: {
    console: boolean;
    folderPath: string;
    humanReadable: boolean;
    returnScore: boolean;
  };
  weights: {
    question: number;
    llm: number;
    formatting: number;
    metadata: number;
    initialization: number;
  };
  llm: {
    temperature: number;
    topP: number;
    topK: number;
  };
  prompts: {
    searchTopics: string;
    questionEvaluation: string;
    llmEvaluation: string;
  };
}
```

**Configuration Details**
* `compareLibraries` must have two libraries that have the same product
* `getScore` will output machine-readable results to `result.json` and human-readable results to `result-LIBRARY_NAME.txt` in the specified directory
* `compareLibraries` will output results to `result-compare.json` and `result-compare-LIBRARY_NAME.txt`
* The machine-readable file will add or update the libraries.
* `report`
    * `console: true` prints results to the console.
    * `folderPath` specifies the folder for human-readable and machine-readable results (the folder must already exist).
    * `humanReadable` writes the results to a txt file.
    * `returnScore` returns the average score as a number for `getScore` and an object for `compareLibraries`.
* `weights`
    * Specifies weight breakdown for evaluation metrics. If changing the weights, all must have an associated value (can be 0) and must sum to 1.
* `llm`
    * LLM configuration options for Gemini
* `prompts`
    * Replaces the current prompts. It is not recommended to change the final output result instructions or score maximum (e.g., 100 -> 10)
    * Each prompt accepts different placeholders, but they must be formatted as {{variableName}} with the correct associated variable name in the prompt (see Placeholder Reference).

### Placeholder Reference
| Prompt         | For `getScore`                                    | For `compareLibraries`                                                                 |
|---------------|---------------------------------------------------|----------------------------------------------------------------------------------------|
| **searchTopics**  | `{{product}}`, `{{questions}}`                    | –                                                                                      |
| **context**       | `{{contexts}}`, `{{questions}}`                   | `{{contexts[0]}}`, `{{contexts[1]}}`, `{{questions}}`                                  |
| **llmEvaluation** | `{{snippets}}`, `{{snippetDelimiter}}`            | `{{snippets[0]}}`, `{{snippets[1]}}`, `{{snippetDelimiter}}`                           |

**Defaults**
```typescript
{
  report: {
    console: true,
    humanReadable: false,
    returnScore: false
  },
  weights: {
    question: 0.8,
    llm: 0.05,
    formatting: 0.05,
    metadata: 0.05,
    initialization: 0.05
  },
  llm: {
    temperature: 1.0,
    topP: 0.95,
    topK: 64
  }
}

```

## CLI Usage

```shell
context-trace getscore "/facebook/react" -c '{"report": {"console": true}}'

context-trace comparelibraries "/tailwindlabs/tailwindcss.com" "/websites/tailwindcss-com_vercel_app" -c '{"report": {"console": true}}'
```
