import { GoogleGenAI } from '@google/genai';
import { Search } from './search';
import { LLMEvaluator } from './llmEval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore, checkRedirects, createQuestionFile } from './utils';
import fs from 'fs/promises';
import { identifyProduct, identifyProductFile } from './libraryParser';
import { fuzzy } from "fast-fuzzy";
import { humanReadableReport, machineReadableReport, convertScorestoObject } from './writeResults';
import { GetScoreOptions } from './types';

/**
 * Evaluates the snippets of a library using 5 metrics
 * @param libraryList - The list of libraries to evaluate (2 if comparing, 1 otherwise)
 * @param client - The client to use for the LLM evaluation
 * @param headerConfig - The header config to use for the Context7 API
 */
export async function compareLibraries(library1: string, library2: string, options: GetScoreOptions): Promise<void> {
    // Defaults
    const defaultWeights = {
        question: 0.8,
        llm: 0.05,
        formatting: 0.05,
        metadata: 0.025,
        initialization: 0.025,
    };

    const defaultReport = {
        console: true
    };

    // Configurations
    const client = new GoogleGenAI({ apiKey: options.geminiToken });

    let headerConfig = {};
    if (options.context7Token) {
        headerConfig = {
            headers: {
                "Authorization": "Bearer " + options.context7Token
            }
        }
    }

    const libraryList = [library1, library2];

    let prods = [];
    let newLibraryList = [];
    for (const library of libraryList) {
        const redirect = await checkRedirects(library);
        newLibraryList.push(redirect);

        const prod = identifyProduct(redirect);
        prods.push(prod);

    }

    // For compare, check if the products are the same
    const prod1 = prods[0];
    const prod2 = prods[1];
    const matchScore = fuzzy(prod1, prod2);
    if (matchScore < 0.8) {
        throw new Error(`${newLibraryList[0]} and ${newLibraryList[1]} do not have the same product`);
    }

    // Check if the product has an existing questions file
    const search = new Search(prods[0], client);
    const filePath = identifyProductFile(prods[0]);
    let questions = "";
    if (filePath === null) {
        console.log("❌ No existing questions file found for", prods[0]);
        questions = await search.googleSearch();
        await createQuestionFile(prods[0], questions);
    } else {
        console.log("✅ Existing questions file found for", prods[0]);
        questions = await fs.readFile(filePath, "utf8");
    }

    const searchTopics = await search.generateSearchTopics(questions);

    const contexts = await Promise.all(newLibraryList.map(newLibrary =>
        search.fetchRelevantSnippets(searchTopics, newLibrary, headerConfig)
    ));

    const questionResponse = await search.evaluateQuestions(questions, contexts);
    console.log("questionResponse: ", questionResponse);

    const snippets = await Promise.all(newLibraryList.map(newLibrary =>
        scrapeContext7Snippets(newLibrary, headerConfig)
    ));

    const llm_evaluator = new LLMEvaluator(client);
    const llmResponse = await llm_evaluator.llmEvaluate(snippets);

    console.log("llmResponse: ", llmResponse);

    for (let i = 0; i < newLibraryList.length; i++) {

        const {
            formatting,
            metadata,
            initialization,
        } = runStaticAnalysis(snippets[i]);

        const scores = {
            question: questionResponse.questionAverageScores[i],
            llm: llmResponse.llmAverageScores[i],
            formatting: formatting.averageScore,
            metadata: metadata.averageScore,
            initialization: initialization.averageScore,
        }

        const averageScore = calculateAverageScore(scores, options.weights ?? defaultWeights);

        const fullResults = {
            averageScore: averageScore,
            questionScore: questionResponse.questionScores[i],
            questionAverageScore: questionResponse.questionAverageScores[i],
            questionExplanation: questionResponse.questionExplanations[i],
            llmAverageScore: llmResponse.llmAverageScores[i],
            llmExplanation: llmResponse.llmExplanations[i],
            formattingAvgScore: formatting.averageScore,
            metadataAvgScore: metadata.averageScore,
            initializationAvgScore: initialization.averageScore,
        }

        await humanReadableReport(newLibraryList[i], fullResults, options.report ?? defaultReport);
        const scoresObject = convertScorestoObject(newLibraryList[i], scores, averageScore);
        await machineReadableReport(scoresObject, options.report ?? defaultReport);
    }
}
