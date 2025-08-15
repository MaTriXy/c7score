import { GoogleGenAI } from '@google/genai';
import { Search } from './search';
import { LLMEvaluator } from './llmEval'
import { scrapeContext7Snippets, runTextAnalysis, calculateAverageScore, checkRedirects, createQuestionFile } from './utils';
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
): Promise<void | number> {
    
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
    // Identify product of library and redirections
    const redirect = await checkRedirects(library, headerConfig);
    const prod = identifyProduct(redirect);

    // Get questions file for product
    const search = new Search(prod, client, configOptions?.llm, configOptions?.prompts);
    const filePath = await identifyProductFile(prod, githubClient);
    let questions = "";
    if (filePath === null) {
        questions = await search.googleSearch();
        await createQuestionFile(prod, questions, githubClient);
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
        if (!Array.isArray(contentFile) && contentFile.type === "file" && contentFile.content) {
            questions = Buffer.from(contentFile.content, 'base64').toString('utf-8');
        } else {
            throw new Error("Content file is a directory or does not contain content.");
        }
    }

    // Generate search topics and fetch relevant snippets
    const searchTopics = await search.generateSearchTopics(questions);
    const contexts = await search.fetchRelevantSnippets(searchTopics, redirect, headerConfig);

    // Questions evaluation
    const questionResponse = await search.evaluateQuestions(questions, contexts);

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
