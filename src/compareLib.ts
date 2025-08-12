import { GoogleGenAI } from '@google/genai';
import { Search } from './search';
import { LLMEvaluator } from './llmEval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore, checkRedirects, createQuestionFile } from './utils';
import { identifyProduct, identifyProductFile } from './libraryParser';
import { fuzzy } from "fast-fuzzy";
import { convertScorestoObject, humanReadableReport, machineReadableReport } from './writeResults';
import { evalOptions } from './types';
import { Octokit } from 'octokit';
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
    configOptions?: evalOptions
): Promise<void> {

    // Configurations
    config();
    const envConfig = {
        GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
        CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
        GITHUB_API_TOKEN: process.env.GITHUB_API_TOKEN,
    };
    const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });
    const githubClient = new Octokit({ auth: envConfig.GITHUB_API_TOKEN });
    let headerConfig = {};
    if (envConfig.CONTEXT7_API_TOKEN) {
        headerConfig = {
            headers: {
                "Authorization": "Bearer " + envConfig.CONTEXT7_API_TOKEN
            }
        }
    }
 
    // Defaults
    const defaultConfigOptions = {
        report: {
            console: true
        },
        weights: {
            question: 0.8,
            llm: 0.05,
            formatting: 0.05,
            metadata: 0.025,
            initialization: 0.025,
        },
        llm: {
            temperature: 1.0,
            topP: 0.95,
            topK: 64
        }
    }

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
    const prod1 = prods[0];
    const prod2 = prods[1];
    const matchScore = fuzzy(prod1, prod2);
    if (matchScore < 0.8) {
        throw new Error(`${newLibraryList[0]} and ${newLibraryList[1]} do not have the same product`);
    }

    const search = new Search(prods[0], client, configOptions?.llm ?? defaultConfigOptions.llm, configOptions?.prompts);

    // Check if the product has an existing questions file
    const filePath = await identifyProductFile(prods[0], githubClient);
    let questions = "";
    if (filePath === null) {
        questions = await search.googleSearch();
        await createQuestionFile(prods[0], questions, githubClient);
    } else {
        const res = await githubClient.rest.repos.getContent({
            owner: "upstash",
            repo: "c7score",
            path: `benchmark-questions/${filePath}`,
            ref: "main",
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const contentFile = res.data
        // Ensure that the contentFile is not a directory and content exists
        if (!Array.isArray(contentFile) && contentFile.type === "file" && contentFile.content) {
            questions = Buffer.from(contentFile.content, 'base64').toString('utf-8');
        } else {
            throw new Error("Content file is a directory or does not contain content.");
        }
    }
    
    const searchTopics = await search.generateSearchTopics(questions);
    const contexts = await Promise.all(newLibraryList.map(newLibrary =>
        search.fetchRelevantSnippets(searchTopics, newLibrary, headerConfig)
    ));

    const questionResponse = await search.evaluateQuestionsPair(questions, contexts);
    console.log(questionResponse);

    const snippets = await Promise.all(newLibraryList.map(newLibrary =>
        scrapeContext7Snippets(newLibrary, headerConfig)
    ));

    const llm_evaluator = new LLMEvaluator(client, configOptions?.llm ?? defaultConfigOptions.llm, configOptions?.prompts);
    const llmResponse = await llm_evaluator.llmEvaluateCompare(snippets);

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

        const averageScore = calculateAverageScore(scores, configOptions?.weights ?? defaultConfigOptions.weights);

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
        await humanReadableReport(newLibraryList[i], fullResults, configOptions?.report ?? defaultConfigOptions.report, true);
        const scoresObject = convertScorestoObject(newLibraryList[i], scores, averageScore);
        await machineReadableReport(scoresObject, configOptions?.report ?? defaultConfigOptions.report, true);
    }
}
