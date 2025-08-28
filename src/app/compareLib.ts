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
import { checkSameProduct } from '../lib/utils.js';
import { config } from 'dotenv';

/**
 * Compares the snippets of two library using 5 metrics
 * @param library1 - The first library to evaluate
 * @param library2 - The second library to evaluate
 * @param configOptions - The options for the evaluation
 */
export async function compareLibraries(
    library1: string,
    library2: string,
    configOptions?: EvalOptions
): Promise<void | Record<string, number>> {
    
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
            formatting: formatting,
            metadata: metadata,
            initialization: initialization,
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
            formattingAvgScore: Math.round(formatting),
            metadataAvgScore: Math.round(metadata),
            initializationAvgScore: Math.round(initialization),
        }
        returnScores[newLibraryList[i]] = roundedAverageScore;
        await humanReadableReport(newLibraryList[i], fullResults, configOptions?.report, true);
        const scoresObject = convertScoresToObject(newLibraryList[i], scores, roundedAverageScore);
        await machineReadableReport(scoresObject, configOptions?.report, true);
    }

    if (configOptions?.report?.returnScore) {
        return returnScores as Record<string, number>;
    }
}
