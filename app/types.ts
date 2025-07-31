// Expected output for llmEvaluate
export interface LLMScores {
    average_score: number;
    explanation: string;
}

export interface LLMScoresCompare {
    llm_average_score: number[];
    llm_explanation: string[];
}

export interface Metrics {
    context: number;
    llm: number;
    formatting: number;
    projectMetadata: number;
    initialization: number;
}

export interface StaticEvaluatorOutput {
    average_score: number;
    explanation: string;
}

export interface ContextEvaluationOutput {
    scores: number[];
    average_score: number;
    explanation: string[];
}

export interface ContextEvaluationOutputPair {
    context_scores: number[];
    context_average_scores: number[];
    context_explanations: string[];
}