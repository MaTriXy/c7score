import { GoogleGenAI } from '@google/genai';
import { Octokit } from 'octokit';
import { buildContext7Header } from '../config/header';
import { evalOptions } from '../lib/types';
import { runTextAnalysis, calculateAverageScore } from '../lib/utils';
import { QuestionEvaluator } from '../services/questionEval';
import { LLMEvaluator } from '../services/llmEval'
import { getQuestionsFile, identifyProductFile, createQuestionFile } from '../services/github';
import { checkRedirects, scrapeContext7Snippets } from '../services/context7';
import { machineReadableReport, convertScorestoObject } from '../reports/machine';
import { humanReadableReport } from '../reports/human';
import { identifyProduct } from '../lib/utils';
import { validateEnv } from '../config/envValidator';

/**
 * Evaluates the snippets of a library using 5 metrics
 * @param library - The library to evaluate
 * @param configOptions - The options for the evaluation
 */
export async function getScore(
    library: string,
    configOptions?: evalOptions
): Promise<void | number> {
    // Load environment variables
    const envConfig = validateEnv();

    // Initialize clients
    const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });
    const githubClient = new Octokit({ auth: envConfig.GITHUB_API_TOKEN });
    
    // Build header config for Context7 API
    const headerConfig = buildContext7Header(envConfig.CONTEXT7_API_TOKEN);

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
        formatting: formatting.averageScore,
        metadata: metadata.averageScore,
        initialization: initialization.averageScore,
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
        formattingAvgScore: Math.round(formatting.averageScore),
        metadataAvgScore: Math.round(metadata.averageScore),
        initializationAvgScore: Math.round(initialization.averageScore),
    }
    await humanReadableReport(redirect, fullResults, configOptions?.report, false);
    const scoresObject = convertScorestoObject(redirect, scores, roundedAverageScore);
    await machineReadableReport(scoresObject, configOptions?.report, false);

    if (configOptions?.report?.returnScore) {
        return roundedAverageScore;
    }
}
