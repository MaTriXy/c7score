import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { program } from 'commander';
import { Search } from './search';
import { LLMEvaluator } from './llm_eval'
import { scrapeContext7Snippets, runStaticAnalysis, calculateAverageScore } from './utils';
import fs from 'fs/promises';

config();

const envConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
};

const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

/**
 * Evaluates the context of the library using 5 metrics
 * @param library - The name of the library
 * @returns The average score, scores for each metric, and explanations for each metric
 */
export async function snippetEvaluationCompare(library1: string, library2: string, client: GoogleGenAI): Promise<void> {
  console.log("Comparing libraries")
  const search = new Search(library1, client);
  const questions = await search.googleSearch();
  const searchTopics = await search.generateSearchTopics(questions);

  // const context1 = await search.fetchContext(searchTopics, library1);
  // const context2 = await search.fetchContext(searchTopics, library2!);
  const context1 = await search.fetchContext(searchTopics, library1, "app/llms.txt");
  const context2 = await search.fetchContext(searchTopics, library2!, "app/llms.txt");

  const {
    context_scores,
    context_average_scores,
    context_explanations
  } = await search.evaluateContextPair(questions, context1, context2);

  const snippets1 = await scrapeContext7Snippets(library1, "app/llms.txt");
  const snippets2 = await scrapeContext7Snippets(library2!, "app/llms.txt");
  const llm_evaluator = new LLMEvaluator(client, snippets1, snippets2);


  const {
    llm_average_score,
    llm_explanation
  } = await llm_evaluator.llmEvaluateCompare();

  console.log("LLM average score:", llm_average_score);
  console.log("LLM explanation:", llm_explanation);

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
      context: context_average_score,
      llm: llm_average_score,
      formatting: formatting_avg_score,
      projectMetadata: projectMetadata_avg_score,
      initialization: initialization_avg_score,
    }

    const averageScore = await calculateAverageScore(scores);
    console.log("Average score:", averageScore);

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
    await fs.writeFile(`app/results/${library.replace(/\//g, "_").toLowerCase()}.txt`, toSave.join("\n\n"));

  }

}

export async function snippetEvaluation(library: string, client: GoogleGenAI): Promise<void> {
  console.log("Not comparing libraries")
  const search = new Search(library, client);
  const questions = await search.googleSearch();

  // Save questions to file
  await fs.writeFile(`app/questions/${library.replace(/\//g, "_").toLowerCase()}.txt`, questions);

  const searchTopics = await search.generateSearchTopics(questions);
  // const context = await search.fetchContext(searchTopics, library);

  const context = await search.fetchContext(searchTopics, library, "app/llms.txt");

  const {
    scores: context_scores,
    average_score: context_avg_score,
    explanation: context_explanations
  } = await search.evaluateContext(questions, context);

  // const snippets = await scrapeContext7Snippets(library);
  const snippets = await scrapeContext7Snippets(library, "app/llms.txt");
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

  const averageScore = await calculateAverageScore(scores);
  console.log("Average score:", averageScore);

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
  await fs.writeFile(`app/results/${library.replace(/\//g, "_").toLowerCase()}.txt`, toSave.join("\n\n"));

}

if (require.main === module) {
  const buildList = (item: string, list: string[]) => [...(list ?? []), ...item.split(', ')];
  program
    .command('worker')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
      for (const library of options.library) {
        console.log(`Working on ${library}...`)
        await snippetEvaluation(library, client);
      }
    });

  program
    .command('compare')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
      console.log("Comparing...")
      const libraries = options.library;
      if (libraries.length !== 2) {
        console.error("Please provide exactly 2 library names")
        return;
      }
      const [library1, library2] = libraries;
      console.log(`Working on ${library1} vs ${library2}...`);
      await snippetEvaluationCompare(library1, library2, client);
    });

  program.parse(process.argv);
}