export interface LLMScores {
    llmAverageScores: number[];
    llmExplanations: string[];
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

export interface QuestionEvaluationOutput {
    questionScores: number[][];
    questionAverageScores: number[];
    questionExplanations: string[][];
}

export type Category = "TITLE" | "DESCRIPTION" | "SOURCE" | "LANGUAGE" | "CODE";

export interface GetScoreOptions {
    geminiToken: string;
    context7Token?: string;
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