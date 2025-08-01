import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { program } from 'commander';
import { Search } from './search';
import { LLMEvaluator } from './llm_eval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore, createQuestionFile } from './utils';
import fs from 'fs/promises';
import { identifyProduct, identifyProductFile } from './library_parser';
import { fuzzy } from "fast-fuzzy";

config();

const envConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
  CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
};

const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

const header_config = {
  headers: {
    "Authorization": "Bearer " + envConfig.CONTEXT7_API_TOKEN
  }
}

/**
 * Evaluates the context of the library using 5 metrics
 * @param library - The name of the library
 * @returns The average score, scores for each metric, and explanations for each metric
 */
export async function snippetEvaluationCompare(library1: string, library2: string, client: GoogleGenAI, header_config: object): Promise<void> {
  const prod1 = identifyProduct(library1);
  const prod2 = identifyProduct(library2);

  // Check if the products are the same
  const match_score = fuzzy(prod1, prod2);
  if (match_score < 0.8) {
    throw new Error(`${library1} and ${library2} are not the same library`);
  }
  const search = new Search(prod1, client);

  // Check if the product has an existing questions file
  let questions = "";
  const file = identifyProductFile(prod1);
  if (file === null) {
    console.log("No existing questions file found for", prod1);
    questions = await search.googleSearch();
    await createQuestionFile(prod1, questions);

  } else {
    console.log("Existing questions file found for", prod1);
    questions = await fs.readFile(file, "utf8");
  }

  const searchTopics = await search.generateSearchTopics(questions);

  const context1 = await search.fetchContext(searchTopics, library1, header_config);
  const context2 = await search.fetchContext(searchTopics, library2!, header_config);

  const {
    context_scores,
    context_average_scores,
    context_explanations
  } = await search.evaluateContextPair(questions, context1, context2);

  const snippets1 = await scrapeContext7Snippets(library1, header_config);
  const snippets2 = await scrapeContext7Snippets(library2!, header_config);
  const llm_evaluator = new LLMEvaluator(client, snippets1, snippets2);

  const {
    llm_average_score,
    llm_explanation
  } = await llm_evaluator.llmEvaluateCompare();

  const snippets = [snippets1, snippets2];
  const libraries = [library1, library2];

  const library_outputs = snippets.map((snippet, i) => ({
    snippet: snippet,
    library: libraries[i],
    con_scores: context_scores[i],
    context_average_score: context_average_scores[i],
    context_explanation: context_explanations[i],
    llm_average_score: llm_average_score[i],
    llm_explanation: llm_explanation[i],
  }));

  for (const { snippet, library, con_scores, context_average_score, context_explanation, llm_average_score, llm_explanation } of library_outputs) {
    const {
      formatting_avg_score,
      formatting_explanation,
      projectMetadata_avg_score,
      projectMetadata_explanation,
      initialization_avg_score,
      initialization_explanation
    } = await runStaticAnalysis(snippet);

    const scores = {
      context: context_average_score ?? 0,
      llm: llm_average_score ?? 0,
      formatting: formatting_avg_score,
      projectMetadata: projectMetadata_avg_score,
      initialization: initialization_avg_score,
    }
    console.log("Scores:", scores);

    const averageScore = await calculateAverageScore(scores);

    // Save answers to txt
    const toSave = [
      "== Average Score ==",
      averageScore,
      "== Context Scores ==",
      con_scores,
      "== Context Avg Score ==",
      context_average_score,
      "== Context Explanations ==",
      context_explanation,
      "== LLM Avg Score ==",
      llm_average_score,
      "== LLM Explanation ==",
      llm_explanation,
      "== Formatting Avg Score ==",
      formatting_avg_score,
      formatting_explanation,
      "== Project Metadata Avg Score ==",
      projectMetadata_avg_score,
      projectMetadata_explanation,
      "== Initialization Avg Score ==",
      initialization_avg_score,
      initialization_explanation,
    ]
    await fs.writeFile(`${__dirname}/../out/result-${library.replace(/\//g, "-").replace(".", "-").replace("_", "-").toLowerCase()}.txt`, toSave.join("\n\n"));
  }
}

export async function snippetEvaluation(library: string, client: GoogleGenAI, header_config: object): Promise<void> {
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

  const context = await search.fetchContext(searchTopics, library, header_config);

  const {
    scores: context_scores,
    average_score: context_avg_score,
    explanation: context_explanations
  } = await search.evaluateContext(questions, context);

  const snippets = await scrapeContext7Snippets(library, header_config);
  const llm_evaluator = new LLMEvaluator(client, snippets);

  const { average_score: llm_avg_score, explanation: llm_explanation } = await llm_evaluator.llmEvaluate();

  const {
    formatting_avg_score,
    formatting_explanation,
    projectMetadata_avg_score,
    projectMetadata_explanation,
    initialization_avg_score,
    initialization_explanation
  } = await runStaticAnalysis(snippets);

  const scores = {
    context: context_avg_score ?? 0,
    llm: llm_avg_score ?? 0,
    formatting: formatting_avg_score,
    projectMetadata: projectMetadata_avg_score,
    initialization: initialization_avg_score,
  }
  console.log("Scores:", scores);
  const averageScore = await calculateAverageScore(scores);

  // Save answers to txt
  const toSave = [
    "== Average Score ==",
    averageScore,
    "== Context Scores ==",
    context_scores,
    "== Context Avg Score ==",
    context_avg_score,
    "== Context Explanations ==",
    context_explanations,
    "== LLM Avg Score ==",
    llm_avg_score,
    "== LLM Explanation ==",
    llm_explanation,
    "== Formatting Avg Score ==",
    formatting_avg_score,
    formatting_explanation,
    "== Project Metadata Avg Score ==",
    projectMetadata_avg_score,
    projectMetadata_explanation,
    "== Initialization Avg Score ==",
    initialization_avg_score,
    initialization_explanation,
  ]
  await fs.writeFile(`${__dirname}/../out/result-${library.replace(/\//g, "-").replace(".", "-").replace("_", "-").toLowerCase()}.txt`, toSave.join("\n\n"));
}

if (require.main === module) {
  const buildList = (item: string, list: string[]) => [...(list ?? []), ...item.split(', ')];
  program
    .command('worker')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
      for (const library of options.library) {
        console.log(`Working on ${library}...`)
        await snippetEvaluation(library, client, header_config);
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
      await snippetEvaluationCompare(library1, library2, client, header_config);
    });

  program.parse(process.argv);
}