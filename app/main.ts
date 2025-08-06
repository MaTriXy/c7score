import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { program } from 'commander';
import { Search } from './search';
import { LLMEvaluator } from './llmEval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore, checkRedirects } from './utils';
import fs from 'fs/promises';
import { identifyProduct, identifyProductFile } from './libraryParser';
import { fuzzy } from "fast-fuzzy";
import { writeToProjectResults, writeToAllResults, convertScorestoObject } from './writeResults';

config();

const envConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
  CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
};

const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

const headerConfig = {
  headers: {
    "Authorization": "Bearer " + envConfig.CONTEXT7_API_TOKEN
  }
}

/**
 * Evaluates the snippets of a library using 5 metrics
 * @param libraryList - The list of libraries to evaluate (2 if comparing, 1 otherwise)
 * @param client - The client to use for the LLM evaluation
 * @param headerConfig - The header config to use for the Context7 API
 */
export async function snippetEvaluation(libraryList: string[], client: GoogleGenAI, headerConfig: object): Promise<void> {
  let prods = [];
  let newLibraryList = [];
  for (const library of libraryList) {
    const prod = identifyProduct(library);
    prods.push(prod);

    const redirect = await checkRedirects(library);
    if (redirect) {
      console.log("Redirect found for", library, redirect);
      newLibraryList.push(redirect);
    } else {
      newLibraryList.push(library);
    }
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

  const contexts = await Promise.all(newLibraryList.map( library =>
    search.fetchRelevantContext(searchTopics, library, headerConfig)
  ));

  const contextResponse = await search.evaluateContext(questions, contexts);

  const snippets = await Promise.all(newLibraryList.map( library =>
    scrapeContext7Snippets(library, headerConfig)
  ));

  const llm_evaluator = new LLMEvaluator(client);
  const llmResponse = await llm_evaluator.llmEvaluate(snippets);
  
  console.log("LLM response: ", llmResponse);

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

    const averageScore = calculateAverageScore(scores);

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

if (require.main === module) {
  const buildList = (item: string, list: string[]) => [...(list ?? []), ...item.split(', ')];
  program
    .command('worker')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
      const libraries = options.library;
      if (libraries.length < 1) {
        throw new Error("Please provide at least one library name")
      }

      for (const library of libraries) {
        console.log(`Working on ${library}...`)
        try {
          const libraryList = [library];
          await snippetEvaluation(libraryList, client, headerConfig);
        } catch (error) {
          console.error(`Error in ${library}: ${error}`);
        }
      }
    });

  program
    .command('compare')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
      console.log("Comparing...")
      const libraries = options.library;
      if (libraries.length !== 2) {
        throw new Error("Please provide exactly 2 library names")
      }
      const [library1, library2] = libraries;
      console.log(`Working on ${library1} vs ${library2}...`);
      try {
        const libraryList = [library1, library2];
        await snippetEvaluation(libraryList, client, headerConfig);
      } catch (error) {
        console.error(`Error in ${library1} vs ${library2}: ${error}.`);
      }
    });

  program.parse(process.argv);
}