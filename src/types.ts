export interface evalOptions {
    report?: {
        console?: boolean;  // Whether to print to console
        folderPath?: string; // Where to save the human readable or machine readable report
        humanReadable?: boolean; // Whether to save the human readable report to a file
        returnScore?: boolean; // Whether to return the average score for the library
    };
    // Weights for the different metrics, must sum to 1
    weights?: {
        question: number;
        llm: number;
        formatting: number;
        metadata: number;
        initialization: number;
    };
    // Gemini API configuration options
    llm?: {
        temperature?: number;
        topP?: number;
        topK?: number;
    };
    // Prompts for LLM-based evaluation metrics
    prompts?: {
        searchTopics?: string;
        questionEvaluation?: string;
        llmEvaluation?: string;
    }
}

export interface QuestionEvaluationOutput {
    questionAverageScore: number;
    questionExplanation: string;
}

export interface QuestionEvaluationPairOutput {
    questionAverageScores: number[];
    questionExplanations: string[];
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

export interface TextEvaluatorOutput {
    averageScore: number;
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