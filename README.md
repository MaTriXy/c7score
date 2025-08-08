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

```
var contextTrace = require("@shannonrumsey/context-trace) 

contextTrace.getScore(
    "/facebook/react", 
    { 
    geminiToken: envConfig.GEMINI_API_TOKEN!,
    githubToken: envConfig.GITHUB_TOKEN!,
    context7Token: envConfig.CONTEXT7_API_TOKEN!,
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
    geminiToken: envConfig.GEMINI_API_TOKEN!,
    githubToken: envConfig.GITHUB_TOKEN!,
    context7Token: envConfig.CONTEXT7_API_TOKEN!,
    report: 
        {
            console: true,
            folderPath: `${__dirname}/../compare-results`
        }
    }
);
```

### Configuration
**Notes:**
* getScore only takes in one library whereas compareLibraries must take only two libraries.
* Configuration options are the same for getScore and compareLibraries.
* Only the libraries, Gemini API key, Github key, and Context7 API key are mandatory.
* Machine-readable results will always be uploaded to `https://github.com/upstash/ContextTrace/blob/main/result.json` (.getScore only). 

All possible options:
```
{
    geminiToken: Gemini API key,
    context7Token: Context7 API key,
    report: {
        console: boolean (print the results to the console)
        folderPath: string (full path to directory for results. Folder must already exist.)
    } 
    weights: {
        (weights must sum to 1)
        "context": number,
        "llm": number,
        "formatting": number,
        "metadata": number,
        "initialization": number
    } 
}
```