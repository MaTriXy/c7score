export interface QuestionEvaluationOutput {
    questionScores: number[];
    questionAverageScore: number;
    questionExplanations: string[];
}

export interface QuestionEvaluationPairOutput {
    questionScores: number[][];
    questionAverageScores: number[];
    questionExplanations: string[][];
}

export type Category = "TITLE" | "DESCRIPTION" | "SOURCE" | "LANGUAGE" | "CODE";

export interface LLMScoresCompare {
    llmAverageScores: number[];
    llmExplanations: string[];
}
export interface LLMScores {
    llmAverageScore: number;
    llmExplanation: string;
}

export interface Metrics {
    question: number;
    llm: number;
    formatting: number;
    metadata: number;
    initialization: number;
}

export interface StaticEvaluatorOutput {
    averageScore: number;
}

export interface evalOptions {
    report?: {
        console?: boolean;
        folderPath?: string;
    };
    weights?: {
        question: number;
        llm: number;
        formatting: number;
        metadata: number;
        initialization: number;
    };
    llm?: {
        temperature: number;
        topP: number;
        topK: number;
    };
    prompts?: {
        searchTopics?: string;
        questionEvaluation?: string;
        llmEvaluation?: string;
    }
}

export interface ProjectData {
    scores: {
        question: number;
        llm: number;
        formatting: number;
        metadata: number;
        initialization: number;
    };
    averageScore: number;
}