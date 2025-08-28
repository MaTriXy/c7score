import { GoogleGenAI } from '@google/genai';
import { Octokit } from '@octokit/rest';
import { buildContext7Header } from '../config/header.js';
import { EvalOptions } from '../lib/types.js';
import { runTextAnalysis, calculateAverageScore } from '../lib/utils.js';
import { QuestionEvaluator } from '../services/questionEval.js';
import { LLMEvaluator } from '../services/llmEval.js'
import { getQuestionsFile, identifyProductFile, createQuestionFile } from '../services/github.js';
import { checkRedirects, scrapeContext7Snippets } from '../services/context7.js';
import { machineReadableReport, convertScoresToObject } from '../reports/machine.js';
import { humanReadableReport } from '../reports/human.js';
import { identifyProduct } from '../lib/utils.js';
import { config } from 'dotenv';

/**
 * Evaluates the snippets of a library using 5 metrics
 * @param library - The library to evaluate
 * @param configOptions - The options for the evaluation
 */
export async function getScore(
    library: string,
    configOptions?: EvalOptions
): Promise<void | number> {

    // Load environment variables
    config();

    if (!process.env.CONTEXT7_API_TOKEN) {
        throw new Error("CONTEXT7_API_TOKEN environment variable is required for Context7 API authentication!");
    }
    if (!process.env.GITHUB_API_TOKEN) {
        throw new Error("GITHUB_API_TOKEN environment variable is required for GitHub API authentication!");
    }

    // Initialize clients
    let client: GoogleGenAI;
    if (process.env.VERTEX_AI) {
        if (!process.env.GOOGLE_CLOUD_PROJECT) {
            throw new Error("GOOGLE_CLOUD_PROJECT environment variable is required for Vertex AI authentication!");
        }
        const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
        const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "global";

        // Always set GOOGLE_APPLICATION_CREDENTIALS if not already set
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error("Google Application Credentials not set!");
        }

        client = new GoogleGenAI({
            vertexai: true,
            project: GOOGLE_CLOUD_PROJECT,
            location: GOOGLE_CLOUD_LOCATION,

        });
    } else {
        if (!process.env.GEMINI_API_TOKEN) {
            throw new Error("GEMINI_API_TOKEN environment variable is required for Gemini API authentication!");
        }
        client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_TOKEN });
    }
    const githubClient = new Octokit({ auth: process.env.GITHUB_API_TOKEN });
    
    // Build header config for Context7 API
    const headerConfig = buildContext7Header(process.env.CONTEXT7_API_TOKEN);

    // Identify product of library and redirections
    const redirect = await checkRedirects(library, headerConfig);
    const prod = identifyProduct(redirect);

    // Get questions file for product
    const questionEvaluator = new QuestionEvaluator(prod, client, configOptions?.llm, configOptions?.prompts);
    const filePath = await identifyProductFile(prod, githubClient);
    let questions = "";
    if (filePath === null) {
        questions = await questionEvaluator.generateQuestions();
        await createQuestionFile(prod, questions, githubClient);
    } else {
        questions = await getQuestionsFile(filePath, githubClient);
    }

    // Generate search topics and fetch relevant snippets
    const searchTopics = await questionEvaluator.generateSearchTopics(questions);
    const contexts = await questionEvaluator.fetchRelevantSnippets(searchTopics, redirect, headerConfig);

    // Questions evaluation
    const questionResponse = await questionEvaluator.evaluateQuestions(questions, contexts);

    // Scrape Context7 snippets
    const snippets = await scrapeContext7Snippets(redirect, headerConfig);

    // LLM evaluation
    const llm_evaluator = new LLMEvaluator(client, configOptions?.llm, configOptions?.prompts);
    const llmResponse = await llm_evaluator.llmEvaluate(snippets);

    // Text analysis
    const {
        formatting,
        metadata,
        initialization,
    } = runTextAnalysis(snippets);

    // Calculate scores
    const scores = {
        question: questionResponse.questionAverageScore,
        llm: llmResponse.llmAverageScore,
        formatting: formatting,
        metadata: metadata,
        initialization: initialization
    }
    const averageScore = calculateAverageScore(scores, configOptions?.weights);
    const roundedAverageScore = Math.round(averageScore);

    // Write results
    const fullResults = {
        averageScore: roundedAverageScore,
        questionAverageScore: Math.round(questionResponse.questionAverageScore),
        questionExplanation: questionResponse.questionExplanation,
        llmAverageScore: Math.round(llmResponse.llmAverageScore),
        llmExplanation: llmResponse.llmExplanation,
        formattingAvgScore: Math.round(formatting),
        metadataAvgScore: Math.round(metadata),
        initializationAvgScore: Math.round(initialization),
    }
    await humanReadableReport(redirect, fullResults, configOptions?.report, false);
    const scoresObject = convertScoresToObject(redirect, scores, roundedAverageScore);
    await machineReadableReport(scoresObject, configOptions?.report, false);

    if (configOptions?.report?.returnScore) {
        return roundedAverageScore;
    }
}
