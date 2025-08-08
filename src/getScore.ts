import { GoogleGenAI } from '@google/genai';
import { Search } from './search';
import { LLMEvaluator } from './llmEval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore, checkRedirects, createQuestionFile } from './utils';
import { identifyProduct, identifyProductFile } from './libraryParser';
import { humanReadableReport, machineReadableReport, convertScorestoObject } from './writeResults';
import { GetScoreOptions } from './types';
import { Octokit } from 'octokit';

/**
 * Evaluates the snippets of a library using 5 metrics
 * @param libraryList - The list of libraries to evaluate (2 if comparing, 1 otherwise)
 * @param client - The client to use for the LLM evaluation
 * @param headerConfig - The header config to use for the Context7 API
 * Note: 
 */
export async function getScore(library: string, options: GetScoreOptions): Promise<void> {
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
    const githubClient = new Octokit({ auth: options.githubToken });
    let headerConfig = {};
    if (options.context7Token) {
        headerConfig = {
            headers: {
                "Authorization": "Bearer " + options.context7Token
            }
        }
    }
    const redirect = await checkRedirects(library);
    const prod = identifyProduct(redirect);

    // Check if the product has an existing questions file
    const search = new Search(prod, client);
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

    const questionResponse = await search.evaluateQuestions(questions, [contexts]);

    const snippets = await scrapeContext7Snippets(redirect, headerConfig);

    const llm_evaluator = new LLMEvaluator(client);
    const llmResponse = await llm_evaluator.llmEvaluate([snippets]);

    const {
        formatting,
        metadata,
        initialization,
    } = runStaticAnalysis(snippets);

    const scores = {
        question: questionResponse.questionAverageScores[0],
        llm: llmResponse.llmAverageScores[0],
        formatting: formatting.averageScore,
        metadata: metadata.averageScore,
        initialization: initialization.averageScore,
    }

    const averageScore = calculateAverageScore(scores, options.weights ?? defaultWeights);

    const fullResults = {
        averageScore: averageScore,
        questionScore: questionResponse.questionScores[0],
        questionAverageScore: questionResponse.questionAverageScores[0],
        questionExplanation: questionResponse.questionExplanations[0],
        llmAverageScore: llmResponse.llmAverageScores[0],
        llmExplanation: llmResponse.llmExplanations[0],
        formattingAvgScore: formatting.averageScore,
        metadataAvgScore: metadata.averageScore,
        initializationAvgScore: initialization.averageScore,
    }
    await humanReadableReport(redirect, fullResults, options.report ?? defaultReport);
    const scoresObject = convertScorestoObject(redirect, scores, averageScore);
    await machineReadableReport(scoresObject, githubClient);
}
