export interface LLMScores {
    llmAverageScores: number[];
    llmExplanations: string[];
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
    contextScores: number[][];
    contextAverageScores: number[];
    contextExplanations: string[][];
}

export type Category = "TITLE" | "DESCRIPTION" | "SOURCE" | "LANGUAGE" | "CODE";