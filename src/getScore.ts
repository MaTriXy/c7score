import { GoogleGenAI } from '@google/genai';
import { Search } from './search';
import { LLMEvaluator } from './llmEval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore, checkRedirects, createQuestionFile } from './utils';
import { identifyProduct, identifyProductFile } from './libraryParser';
import { humanReadableReport, machineReadableReport, convertScorestoObject } from './writeResults';
import { evalOptions } from './types';
import { Octokit } from 'octokit';
import { config } from 'dotenv';

/**
 * Evaluates the snippets of a library using 5 metrics
 * @param library - The library to evaluate
 * @param configOptions - The options for the evaluation
 */
export async function getScore(
    library: string,
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

    const redirect = await checkRedirects(library);
    const prod = identifyProduct(redirect);

    // Check if the product has an existing questions file
    const search = new Search(prod, client, configOptions?.llm ?? defaultConfigOptions.llm);
    const filePath = await identifyProductFile(prod, githubClient);
    let questions = "";
    if (filePath === null) {
        questions = await search.googleSearch();
        await createQuestionFile(prod, questions, githubClient);

    } else {
        const res = await githubClient.rest.repos.getContent({
            owner: "upstash",
            repo: "ContextTrace",
            path: `benchmark-questions/${filePath}`,
            ref: "main",
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const contentFile = res.data
        // Ensure that the contentFile is not a directory and content exists
        if (!Array.isArray(contentFile) && contentFile.type === "file" && contentFile.content) {
            const decodedContent = Buffer.from(contentFile.content, 'base64').toString('utf-8');
            questions = JSON.parse(decodedContent);
        } else {
            throw new Error("Content file is a directory or does not contain content.");
        }
    }
    const searchTopics = await search.generateSearchTopics(questions);
    const contexts = await search.fetchRelevantSnippets(searchTopics, redirect, headerConfig);

    const questionResponse = await search.evaluateQuestions(questions, contexts);

    const snippets = await scrapeContext7Snippets(redirect, headerConfig);

    const llm_evaluator = new LLMEvaluator(client, configOptions?.llm ?? defaultConfigOptions.llm);
    const llmResponse = await llm_evaluator.llmEvaluate(snippets);

    const {
        formatting,
        metadata,
        initialization,
    } = runStaticAnalysis(snippets);

    const scores = {
        question: questionResponse.questionAverageScore,
        llm: llmResponse.llmAverageScore,
        formatting: formatting.averageScore,
        metadata: metadata.averageScore,
        initialization: initialization.averageScore,
    }

    const averageScore = calculateAverageScore(scores, configOptions?.weights ?? defaultConfigOptions.weights);

    const fullResults = {
        averageScore: averageScore,
        questionScore: questionResponse.questionScores,
        questionAverageScore: questionResponse.questionAverageScore,
        questionExplanation: questionResponse.questionExplanations,
        llmAverageScore: llmResponse.llmAverageScore,
        llmExplanation: llmResponse.llmExplanation,
        formattingAvgScore: formatting.averageScore,
        metadataAvgScore: metadata.averageScore,
        initializationAvgScore: initialization.averageScore,
    }
    await humanReadableReport(redirect, fullResults, configOptions?.report ?? defaultConfigOptions.report, false);
    const scoresObject = convertScorestoObject(redirect, scores, averageScore);
    await machineReadableReport(scoresObject, configOptions?.report ?? defaultConfigOptions.report, false);
}
