import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { program } from 'commander';
import { Search } from './search';
import { LLMEvaluator } from './llm_eval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore, createQuestionFile } from './utils';
import fs from 'fs/promises';
import { identifyProduct, identifyProductFile } from './library_parser';
import { fuzzy } from "fast-fuzzy";
import { writeToProjectResults, writeToAllResults, convertScorestoObject } from './write_results';

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
 * Evaluates the context of the library using 5 metrics
 * @param library - The name of the library
 * @returns The average score, scores for each metric, and explanations for each metric
 */
export async function snippetEvaluationCompare(library1: string, library2: string, client: GoogleGenAI, headerConfig: object): Promise<void> {
  const prod1 = identifyProduct(library1);
  const prod2 = identifyProduct(library2);

  // Check if the products are the same
  const matchScore = fuzzy(prod1, prod2);
  if (matchScore < 0.8) {
    throw new Error(`${library1} and ${library2} are not the same library`);
  }
  const search = new Search(prod1, client);

  // Check if the product has an existing questions file
  let questions = "";
  const file = identifyProductFile(prod1);
  if (file === null) {
    console.log("No existing questions file found for", prod1);
    questions = await search.googleSearch();

  } else {
    console.log("Existing questions file found for", prod1);
    questions = await fs.readFile(file, "utf8");
  }

  const searchTopics = await search.generateSearchTopics(questions);

  const context1 = await search.fetchContext(searchTopics, library1, headerConfig);
  const context2 = await search.fetchContext(searchTopics, library2!, headerConfig);

  const contextResponse = await search.evaluateContextPair(questions, context1, context2);

  const snippets1 = await scrapeContext7Snippets(library1, headerConfig);
  const snippets2 = await scrapeContext7Snippets(library2!, headerConfig);
  const llm_evaluator = new LLMEvaluator(client, snippets1, snippets2);

  const llmResponse = await llm_evaluator.llmEvaluateCompare();

  const snippets = [snippets1, snippets2];
  const libraries = [library1, library2];

  const library_outputs = snippets.map((snippet, i) => ({
    snippet: snippet,
    library: libraries[i],
    contextScores: contextResponse.contextScores[i],
    contextAverageScore: contextResponse.contextAverageScores[i],
    contextExplanation: contextResponse.contextExplanations[i],
    llmAverageScore: llmResponse.llmAverageScore[i],
    llmExplanation: llmResponse.llmExplanation[i],
  }));

  for (const { snippet, library, contextScores, contextAverageScore, contextExplanation, llmAverageScore, llmExplanation } of library_outputs) {

    const {
      formatting,
      projectMetadata,
      initialization,
    } = await runStaticAnalysis(snippet);

    const scores = {
      context: contextAverageScore,
      llm: llmAverageScore,
      formatting: formatting.averageScore,
      projectMetadata: projectMetadata.averageScore,
      initialization: initialization.averageScore,
    }

    const averageScore = await calculateAverageScore(scores);

    const fullResults = {
      averageScore: averageScore,
      contextScores: contextScores,
      contextAverageScore: contextAverageScore,
      contextExplanation: contextExplanation,
      llmAverageScore: llmAverageScore,
      llmExplanation: llmExplanation,
      formattingAvgScore: formatting.averageScore,
      projectMetadataAvgScore: projectMetadata.averageScore,
      initializationAvgScore: initialization.averageScore,
    }
    await writeToProjectResults(library, fullResults, "compare-out");
  }
}

export async function snippetEvaluation(library: string, client: GoogleGenAI, headerConfig: object): Promise<void> {
  console.log("Not comparing libraries")
  const prod = identifyProduct(library);
  const search = new Search(prod, client);

  // Check if the product has an existing questions file
  let questions = "";
  const file = identifyProductFile(prod);
  if (file === null) {
    console.log("No existing questions file found for", prod);
    questions = await search.googleSearch();
    await createQuestionFile(prod, questions);

  } else {
    console.log("Existing questions file found for", prod);
    questions = await fs.readFile(file, "utf8");
  }

  const searchTopics = await search.generateSearchTopics(questions);

  const context = await search.fetchContext(searchTopics, library, headerConfig);

  const contextResponse = await search.evaluateContext(questions, context);


  const snippets = await scrapeContext7Snippets(library, headerConfig);
  const llm_evaluator = new LLMEvaluator(client, snippets);

  const llmResponse = await llm_evaluator.llmEvaluate();

  const {
    formatting,
    projectMetadata,
    initialization,
  } = await runStaticAnalysis(snippets);


  const scores = {
    context: contextResponse.contextAverageScore,
    llm: llmResponse.llmAverageScore,
    formatting: formatting.averageScore,
    projectMetadata: projectMetadata.averageScore,
    initialization: initialization.averageScore,
  }

  const averageScore = await calculateAverageScore(scores);

  const fullResults = {
    averageScore: averageScore,
    contextScores: contextResponse.contextScores,
    contextAverageScore: contextResponse.contextAverageScore,
    contextExplanation: contextResponse.contextExplanation,
    llmAverageScore: llmResponse.llmAverageScore,
    llmExplanation: llmResponse.llmExplanation,
    formattingAvgScore: formatting.averageScore,
    projectMetadataAvgScore: projectMetadata.averageScore,
    initializationAvgScore: initialization.averageScore,
  }

  await writeToProjectResults(library, fullResults, "out");

  const scoresObject = convertScorestoObject(library, scores, averageScore);

  await writeToAllResults(scoresObject);
}

if (require.main === module) {
  const buildList = (item: string, list: string[]) => [...(list ?? []), ...item.split(', ')];
  program
    .command('worker')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
      for (const library of options.library) {
        console.log(`Working on ${library}...`)
        try {
          await snippetEvaluation(library, client, headerConfig);
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
        await snippetEvaluationCompare(library1, library2, client, headerConfig);
      } catch (error) {
        console.error(`Error in ${library1} vs ${library2}: ${error}.`);
      }
    });

  program.parse(process.argv);
}