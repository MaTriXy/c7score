import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Search } from './search';
import { LLMEvaluator } from './llmEval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore, checkRedirects } from './utils';
import fs from 'fs/promises';
import { identifyProduct, identifyProductFile } from './libraryParser';
import { fuzzy } from "fast-fuzzy";
import { writeToProjectResults, writeToAllResults, convertScorestoObject } from './writeResults';
import { GetScoreOptions } from './types';

/**
 * Evaluates the snippets of a library using 5 metrics
 * @param libraryList - The list of libraries to evaluate (2 if comparing, 1 otherwise)
 * @param client - The client to use for the LLM evaluation
 * @param headerConfig - The header config to use for the Context7 API
 */
export async function getScore(libraryList: string[], options: GetScoreOptions): Promise<void> {

  const client = new GoogleGenAI({ apiKey: options.geminiToken });

  let headerConfig = {};
  if (options.context7Token) {
    headerConfig = {
      headers: {
        "Authorization": "Bearer " + options.context7Token
      }
    }
  }

  let prods = [];
  let newLibraryList = [];
  for (const library of libraryList) {
    const redirect = await checkRedirects(library);
    newLibraryList.push(redirect);

    const prod = identifyProduct(redirect);
    prods.push(prod);

  }

  // For compare, check if the products are the same
  if (prods.length === 2) {
    const prod1 = prods[0];
    const prod2 = prods[1];
    const matchScore = fuzzy(prod1, prod2);
    if (matchScore < 0.8) {
      throw new Error(`${newLibraryList[0]} and ${newLibraryList[1]} do not have the same product`);
    }
  }
  // Check if the product has an existing questions file
  const search = new Search(prods[0], client);
  const filePath = identifyProductFile(prods[0]);
  let questions = "";
  if (filePath === null) {
    console.log("❌ No existing questions file found for", prods[0]);
    questions = await search.googleSearch();
  } else {
    console.log("✅ Existing questions file found for", prods[0]);
    questions = await fs.readFile(filePath, "utf8");
  }

  const searchTopics = await search.generateSearchTopics(questions);

  const contexts = await Promise.all(newLibraryList.map(newLibrary =>
    search.fetchRelevantContext(searchTopics, newLibrary, headerConfig)
  ));

  const contextResponse = await search.evaluateContext(questions, contexts);

  const snippets = await Promise.all(newLibraryList.map(newLibrary =>
    scrapeContext7Snippets(newLibrary, headerConfig)
  ));

  const llm_evaluator = new LLMEvaluator(client);
  const llmResponse = await llm_evaluator.llmEvaluate(snippets);

  for (let i = 0; i < newLibraryList.length; i++) {

    const {
      formatting,
      projectMetadata,
      initialization,
    } = runStaticAnalysis(snippets[i]);

    const scores = {
      context: contextResponse.contextAverageScores[i],
      llm: llmResponse.llmAverageScores[i],
      formatting: formatting.averageScore,
      projectMetadata: projectMetadata.averageScore,
      initialization: initialization.averageScore,
    }

    const defaultWeights = {   
      context: 0.8,
      llm: 0.05,
      formatting: 0.05,
      projectMetadata: 0.025,
      initialization: 0.025,
  };
    const averageScore = calculateAverageScore(scores, options.weights ?? defaultWeights);

    const fullResults = {
      averageScore: averageScore,
      contextScores: contextResponse.contextScores[i],
      contextAverageScore: contextResponse.contextAverageScores[i],
      contextExplanation: contextResponse.contextExplanations[i],
      llmAverageScore: llmResponse.llmAverageScores[i],
      llmExplanation: llmResponse.llmExplanations[i],
      formattingAvgScore: formatting.averageScore,
      projectMetadataAvgScore: projectMetadata.averageScore,
      initializationAvgScore: initialization.averageScore,
    }

    if (newLibraryList.length === 2) {
      await writeToProjectResults(newLibraryList[i], fullResults, "compare-out");
    } else {
      await writeToProjectResults(newLibraryList[i], fullResults, "out");
      const scoresObject = convertScorestoObject(newLibraryList[i], scores, averageScore);
      await writeToAllResults(scoresObject);
    }
  }
}
