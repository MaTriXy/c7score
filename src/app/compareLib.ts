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
import { checkSameProduct } from '../lib/utils';

/**
 * Compares the snippets of two library using 5 metrics
 * @param library1 - The first library to evaluate
 * @param library2 - The second library to evaluate
 * @param configOptions - The options for the evaluation
 */
export async function compareLibraries(
    library1: string,
    library2: string,
    configOptions?: evalOptions
): Promise<void | Record<string, number>> {
    // Load environment variables
    const envConfig = validateEnv();

    // Initialize clients
    const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });
    const githubClient = new Octokit({ auth: envConfig.GITHUB_API_TOKEN });

    // Build header config for Context7 API
    const headerConfig = buildContext7Header(envConfig.CONTEXT7_API_TOKEN);

    // Identify products of libraries and redirections
    const libraryList = [library1, library2];
    let prods = [];
    let newLibraryList = [];
    for (const library of libraryList) {
        const redirect = await checkRedirects(library, headerConfig);
        newLibraryList.push(redirect);
        const prod = identifyProduct(redirect);
        prods.push(prod);
    }

    // Check that the libraries have the same product
    const product = checkSameProduct(prods);

    const questionEvaluator = new QuestionEvaluator(product, client, configOptions?.llm, configOptions?.prompts);

    // Get questions file for product
    const filePath = await identifyProductFile(product, githubClient);
    let questions = "";
    if (filePath === null) {
        questions = await questionEvaluator.generateQuestions();
        await createQuestionFile(prods[0], questions, githubClient);
    } else {
        questions = await getQuestionsFile(filePath, githubClient);
    }

    // Generate search topics and fetch relevant snippets
    const searchTopics = await questionEvaluator.generateSearchTopics(questions);
    const contexts = await Promise.all(newLibraryList.map(newLibrary =>
        questionEvaluator.fetchRelevantSnippets(searchTopics, newLibrary, headerConfig)
    ));

    // Questions evaluation
    const questionResponse = await questionEvaluator.evaluateQuestionsPair(questions, contexts);

    // Scrape Context7 snippets
    const snippets = await Promise.all(newLibraryList.map(newLibrary =>
        scrapeContext7Snippets(newLibrary, headerConfig)
    ));

    // LLM evaluation
    const llm_evaluator = new LLMEvaluator(client, configOptions?.llm, configOptions?.prompts);
    const llmResponse = await llm_evaluator.llmEvaluateCompare(snippets);

    let returnScores: Record<string, number> = {};
    for (let i = 0; i < newLibraryList.length; i++) {

        // Text analysis
        const {
            formatting,
            metadata,
            initialization,
        } = runTextAnalysis(snippets[i]);

        // Calculate scores
        const scores = {
            question: questionResponse.questionAverageScores[i],
            llm: llmResponse.llmAverageScores[i],
            formatting: formatting.averageScore,
            metadata: metadata.averageScore,
            initialization: initialization.averageScore,
        }
        const averageScore = calculateAverageScore(scores, configOptions?.weights);
        const roundedAverageScore = Math.round(averageScore);

        // Write results
        const fullResults = {
            averageScore: roundedAverageScore,
            questionAverageScore: Math.round(questionResponse.questionAverageScores[i]),
            questionExplanation: questionResponse.questionExplanations[i],
            llmAverageScore: Math.round(llmResponse.llmAverageScores[i]),
            llmExplanation: llmResponse.llmExplanations[i],
            formattingAvgScore: Math.round(formatting.averageScore),
            metadataAvgScore: Math.round(metadata.averageScore),
            initializationAvgScore: Math.round(initialization.averageScore),
        }
        returnScores[newLibraryList[i]] = roundedAverageScore;
        await humanReadableReport(newLibraryList[i], fullResults, configOptions?.report, true);
        const scoresObject = convertScorestoObject(newLibraryList[i], scores, roundedAverageScore);
        await machineReadableReport(scoresObject, configOptions?.report, true);
    }

    if (configOptions?.report?.returnScore) {
        return returnScores as Record<string, number>;
    }
}
