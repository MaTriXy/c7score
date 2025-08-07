# `context-trace`

The `context-trace` package is used to evaluate the quality of Upstash's Context7 MCP snippets.

## Metrics
`context-trace` uses the following five metrics to grade quality. The metrics can be divided into two groups: LLM analysis and static analysis.
1. LLM Analysis
    * Metric 1 (Question-Snippet Comparison): How well the snippets answer common developer questions.
    * Metric 2 (LLM stand in for human eval): Evaluates snippet relevancy, clarity, and correctness. 
2. Static Analysis
    * Metric 3 (Formatting): Determines whether the snippets have the expected format. 
    * Metric 4 (Project Metadata): Checks for irrelevant project information.
    * Metric 5 (Initialization): Looks for basic import and installation statements.

## Usage

```
var contextTrace = require("@shannonrumsey/context-trace) 

contextTrace.getScore([library1, library2, ...], {Gemini API key})
```

### Configuration
**Note:** Using Gemini is recommended for more grounded responses.

All possible options:
```
{
    Gemini API key (Mandatory),
    Context7 API key (Optional),
    Weights {
        "context": ...,
        "llm": ...,
        "formatting": ...,
        "projectMetadata": ...,
        "initialization": ...
    }
}
```