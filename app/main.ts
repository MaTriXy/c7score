import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { program } from 'commander';
import { Search } from './search';
import { Evaluator } from './evaluator';
import { scrapeContext7Snippets } from './utils';
import fs from 'fs/promises';

config();

const envConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
};

const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

interface ContextEvaluationOutput {
  averageScore: number;
  context_scores: number[];
  context_avg_score: number;
  context_explanations: string[];
  llm_avg_score: number;
  llm_explanation: string;
  formatting_avg_score: number;
  formatting_explanation: string;
  projectMetadata_avg_score: number;
  projectMetadata_explanation: string;
  initialization_avg_score: number;
  initialization_explanation: string;
  otherMessages: string[];
}

interface ContextEvaluationCompareOutput {
  averageScore1: number;
  averageScore2: number;
  context_scores1: number[];
  context_scores2: number[];
  context_avg_score1: number;
  context_avg_score2: number;
  context_explanations1: string[];
  context_explanations2: string[];
  llm_avg_score1: number;
  llm_avg_score2: number;
  llm_explanation1: string;
  formatting_avg_score: number;
  formatting_explanation: string;
  projectMetadata_avg_score: number;
  projectMetadata_explanation: string;
  initialization_avg_score: number;
  initialization_explanation: string;
  otherMessages: string[];
}

/**
 * Evaluates the context of the library using 5 metrics
 * @param library - The name of the library
 * @returns The average score, scores for each metric, and explanations for each metric
 */
export async function contextEvaluation(library: string, client: GoogleGenAI, library2?: string, compare: boolean = false): Promise<ContextEvaluationOutput | ContextEvaluationCompareOutput> {
    const search = new Search(library, client);
    const questions = await search.googleSearch();
    const searchTopics = await search.generateSearchTopics(questions);

    if (compare) {
      const context1 = await search.fetchContext(searchTopics, library);
      const context2 = await search.fetchContext(searchTopics, library2!);
      console.log("Context1:", context1);
      console.log("Context2:", context2);

      const [context_scores1, context_scores2, context_avg_score1, context_avg_score2, context_explanations1, context_explanations2] = await search.evaluateContextPair(questions, context1, context2);

      console.log("📊 Scoring ...")
  
      const snippets = await scrapeContext7Snippets(library);
      const snippets2 = await scrapeContext7Snippets(library2!);
      const evaluator = new Evaluator(client, snippets, snippets2);
  
      const { average_score1: llm_avg_score1, explanation1: llm_explanation1, average_score2: llm_avg_score2, explanation2: llm_explanation2 } = await evaluator.llmEvaluateCompare();

      const results = [];
      for (const [i, context] of [context1, context2].entries()) {
        const otherMessages = [];
        const { average_score: formatting_avg_score, explanation: formatting_explanation } = await evaluator.formatting();
        otherMessages.push(`Formatting: ${formatting_avg_score}, ${formatting_explanation}`);

        const { average_score: projectMetadata_avg_score, explanation: projectMetadata_explanation } = await evaluator.projectMetadata();
        otherMessages.push(`Project metadata: ${projectMetadata_avg_score}, ${projectMetadata_explanation}`);

        const { average_score: initialization_avg_score, explanation: initialization_explanation } = await evaluator.initialization();
        otherMessages.push(`Initialization: ${initialization_avg_score}, ${initialization_explanation}`);

        const context_scores = i === 0 ? context_scores1 : context_scores2;
        const context_avg_score = i === 0 ? context_avg_score1 : context_avg_score2;
        const context_explanations = i === 0 ? context_explanations1 : context_explanations2;
        const llm_avg_score = i === 0 ? llm_avg_score1 : llm_avg_score2;
        const llm_explanation = i === 0 ? llm_explanation1 : llm_explanation2;

        const weights: Record<string, number> = {
          context: 0.25,
          llm: 0.25,
          formatting: 0.25,
          projectMetadata: 0.125,
          initialization: 0.125,
        }

        const scores = {
          context: context_avg_score,
          llm: llm_avg_score,
          formatting: formatting_avg_score,
          projectMetadata: projectMetadata_avg_score,
          initialization: initialization_avg_score,
        }

        const averageScore = Object.entries(scores).reduce((total, [key, value]) => total + value * weights[key], 0);
        console.log("Average score:", averageScore);

        // TODO: fix how the results are stored
        results.push({
          "averageScore": averageScore, "context_scores": context_scores,
          "context_avg_score1": context_avg_score, "context_explanations1": context_explanations,
          "llm_avg_score1": llm_avg_score, "llm_explanation1": llm_explanation,
          "formatting_avg_score1": formatting_avg_score, "formatting_explanation1": formatting_explanation,
          "projectMetadata_avg_score1": projectMetadata_avg_score, "projectMetadata_explanation1": projectMetadata_explanation,
          "initialization_avg_score1": initialization_avg_score, "initialization_explanation1": initialization_explanation,
          "otherMessages": otherMessages
        });
      }

    } else {
      const context = await search.fetchContext(searchTopics, library);
      const [context_scores, context_avg_score, context_explanations] = await search.evaluateContext(questions, context);
      console.log("Context scores:", context_scores);
      console.log("Context average score:", context_avg_score);
      console.log("Context explanations:", context_explanations);

      console.log("📊 Scoring ...")
      const otherMessages = [];
  
      const snippets = await scrapeContext7Snippets(library);
      const evaluator = new Evaluator(client, snippets);
  
      const { average_score: llm_avg_score, explanation: llm_explanation } = await evaluator.llmEvaluate();
  
      console.log("LLM average score:", llm_avg_score);
      console.log("LLM explanation:", llm_explanation);
  
      const { average_score: formatting_avg_score, explanation: formatting_explanation } = await evaluator.formatting();
  
      console.log("Formatting average score:", formatting_avg_score);
      console.log("Formatting explanation:", formatting_explanation);
      otherMessages.push(`Snippets are formatted correctly: ${formatting_avg_score}, ${formatting_explanation}`);
  
      const { average_score: projectMetadata_avg_score, explanation: projectMetadata_explanation } = await evaluator.projectMetadata();
  
      console.log("Project metadata average score:", projectMetadata_avg_score);
      console.log("Project metadata explanation:", projectMetadata_explanation);
      otherMessages.push(`Snippets are free from project metadata: ${projectMetadata_avg_score}, ${projectMetadata_explanation}`);
  
      const { average_score: initialization_avg_score, explanation: initialization_explanation } = await evaluator.initialization();
  
      console.log("Initialization average score:", initialization_avg_score);
      console.log("Initialization explanation:", initialization_explanation);
      otherMessages.push(`Snippets do not contain unnecessary initialization info: ${initialization_avg_score}, ${initialization_explanation}`);
  
      const weights: Record<string, number> = {
          context: 0.25,
          llm: 0.25,
          formatting: 0.25,
          projectMetadata: 0.125,
          initialization: 0.125,
        }
        
        const scores = {
          context: context_avg_score,
          llm: llm_avg_score,
          formatting: formatting_avg_score,
          projectMetadata: projectMetadata_avg_score,
          initialization: initialization_avg_score,
        }
 
      const averageScore = Object.entries(scores).reduce((total, [key, value]) => total + value * weights[key], 0);
      console.log("Average score:", averageScore);
      return {
        "averageScore": averageScore, "context_scores": context_scores,
        "context_avg_score": context_avg_score, "context_explanations": context_explanations,
        "llm_avg_score": llm_avg_score, "llm_explanation": llm_explanation,
        "formatting_avg_score": formatting_avg_score, "formatting_explanation": formatting_explanation,
        "projectMetadata_avg_score": projectMetadata_avg_score, "projectMetadata_explanation": projectMetadata_explanation,
        "initialization_avg_score": initialization_avg_score, "initialization_explanation": initialization_explanation,
        "otherMessages": otherMessages
      };
    }
  }

if (require.main === module) {
  const buildList = (item: string, list: string[]) => [...(list ?? []), ...item.split(', ')];
  program
    .command('worker')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
      for (const library of options.library) {
        console.log(`Working on ${library}...`)
        await contextEvaluation(library, client);
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
      await contextEvaluation(library1, client, library2, true);
    });

  program.parse(process.argv);
}