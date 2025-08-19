export interface Env {
    GEMINI_API_TOKEN: string;
    CONTEXT7_API_TOKEN: string;
    GITHUB_API_TOKEN: string;
}

export interface EvalOptions {
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

export interface HeaderConfig {
    headers: {
        "Authorization": string;
    }
}

export interface ReportOptions {
    console?: boolean;
    folderPath?: string;
    humanReadable?: boolean;
    returnScore?: boolean;
}

export interface Weights {
    question: number;
    llm: number;
    formatting: number;
    metadata: number;
    initialization: number;
}

export interface LLMOptions {
    temperature?: number;
    topP?: number;
    topK?: number;
}

export interface Prompts {
    searchTopics?: string;
    questionEvaluation?: string;
    llmEvaluation?: string;
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

export interface Scores {
    question: number;
    llm: number;
    formatting: number;
    metadata: number;
    initialization: number;
}

export interface FullResults {
    averageScore: number,
    questionAverageScore: number,
    questionExplanation: string,
    llmAverageScore: number,
    llmExplanation: string,
    formattingAvgScore: number,
    metadataAvgScore: number,
    initializationAvgScore: number,
}

export interface ScoresObject {
    [productName: string]: {
        scores: {
            question: number;
            llm: number;
            formatting: number;
            metadata: number;
            initialization: number;
        };
        averageScore: number;
    }
}