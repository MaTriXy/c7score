// Expected output for llmEvaluate
export interface LLMScores {
    llmAverageScore: number;
    llmExplanation: string;
}

export interface LLMScoresCompare {
    llmAverageScore: number[];
    llmExplanation: string[];
}

export interface Metrics {
    context: number;
    llm: number;
    formatting: number;
    projectMetadata: number;
    initialization: number;
}

export interface StaticEvaluatorOutput {
    averageScore: number;
}

export interface ContextEvaluationOutput {
    contextScores: number[];
    contextAverageScore: number;
    contextExplanation: string[];
}

export interface ContextEvaluationOutputPair {
    contextScores: number[];
    contextAverageScores: number[];
    contextExplanations: string[];
}