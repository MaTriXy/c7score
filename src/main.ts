import { config } from 'dotenv';
import { GoogleGenAI, GenerateContentParameters, GenerateContentConfig } from '@google/genai';
import { program } from 'commander';
import { Octokit } from '@octokit/core';
import { Search } from './search';
import { Evaluator } from './evaluator';
import { scrapeContext7Snippets } from './utils';
import fs from 'fs/promises';

interface EnvConfig {
  GEMINI_API_TOKEN?: string;
  GITHUB_TOKEN?: string;
}

config();

const envConfig: EnvConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
};

const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });
const auth = new Octokit({ auth: envConfig.GITHUB_TOKEN });

export async function contextEvaluation(library: string, sourceUrl: string, snippetUrl: string): Promise<void> {
  const search = new Search(library, client);
  const questions = await search.googleSearch();
  const searchTopics = await search.generateSearchTopics(questions);
  const context = await search.fetchContext(searchTopics, snippetUrl);
  console.log("Context:", context);
  const [ context_scores, context_avg_score, context_explanations ] = await search.evaluateContext(questions, context);
  console.log("Context scores:", context_scores);
  console.log("Context average score:", context_avg_score);
  console.log("Context explanations:", context_explanations);

  const formattedExplanations = context_explanations.join("\n");
  const libraryFile = library.replace(/\//g, '\\');
  await fs.writeFile(`src/context_evaluation/${libraryFile}.txt`, `Generated questions: ${questions}\n\nScores per question: ${context_scores}\n\nAverage of question scores: ${context_avg_score}\n\nExplanations: ${formattedExplanations}`, 'utf-8');

  console.log("📊 Scoring ...")
  const otherMessages = [];

  const snippets = await scrapeContext7Snippets(snippetUrl);
  const evaluator = new Evaluator(client, snippets);


}

// export async function createFile(url: string): Promise<void> {
//   const search = new Search(url, { generateContent: client.models.generateContent.bind(client.models) }, modelConfig);
//   const filePath = url.replace(/\//g, '\\');

//   // Problem with Gemini SDK for Node causing undefined to be returned occasionally
//   try {
//     let searchResponse = await search.googleSearch();
//     if (searchResponse.text == undefined) {
//       console.log('Generation returned undefined. Using Python instead...');
//       const nodecallspython = require("node-calls-python");
//       const py = nodecallspython.interpreter;
//       py.import("../py/search.py").then(async function(pymodule: any) {
//         const pyobj = await py.create(pymodule, "Search", [url, client.models.generateContent.bind(client.models), modelConfig]);
//         const searchResponse = await py.call(pyobj, "google_search");
//     });
//       // Retry generation
//       console.log('Generation returned undefined. Retrying generation...');
//       searchResponse = await search.googleSearch();
//     }
//     await fs.writeFile(`src/important_info/${filePath}.txt`, `Google search results: ${searchResponse.text}`, 'utf-8');
//   } catch (error) {
//     console.error(`Error generating search results for ${url}:`, error);
//     await fs.writeFile(`src/important_info/${filePath}.txt`, `Google search results: Error generating search results`, 'utf-8');
//   }
// }

// async function scoreFile(url: string, snippetUrl: string): Promise<void> {
//   console.log('📊 Scoring ...');
//   const filePath = url.replace(/\//g, '\\');
//   let importantInfo: string;

//   try {
//     importantInfo = await fs.readFile(`src/important_info/${filePath}.txt`, 'utf-8');
//   } catch (error) {
//     console.error(`Error reading file ${filePath}:`, error);
//     return;
//   }

//   const snippets = await scrapeContext7Snippets(snippetUrl);
//   const evaluator = new Evaluator(
//     { models: client.models },
//     snippets
//   );

//   // Evaluation tests

//   const llmResult = await evaluator.llmEvaluate(importantInfo);
//   console.log(`📋 LLM Score breakdown: ${llmResult.scores}`);
//   console.log(`📊 Snippets contain important info and syntactically correct ${url}: ${llmResult.total}`);

//   const snippetComplete = evaluator.snippetComplete();
//   console.log(`📊 Snippets contain all the required components: ${snippetComplete}`);

//   const codeSnippetLength = evaluator.codeSnippetLength();
//   console.log(`📊 Code snippets contain meaningful information: ${codeSnippetLength}`);

//   const multipleCodeSnippets = evaluator.multipleCodeSnippets();
//   console.log(`📊 Each snippet has only one code snippet: ${multipleCodeSnippets}`);

//   const languageChecker = evaluator.languageDesc();
//   console.log(`📊 Languages are proper and not just descriptions or console outputs: ${languageChecker}`);

//   const containsList = evaluator.containsList();
//   console.log(`📊 APIDOC code is not just a list: ${containsList}`);

//   const bibtexCitations = evaluator.bibtexCitations();
//   console.log(`📊 Snippets contain bibtex citations: ${bibtexCitations}`);

//   const licenseInfo = evaluator.licenseInfo();
//   console.log(`📊 Snippets contain license information: ${licenseInfo}`);

//   const directoryStructure = evaluator.directoryStructure();
//   console.log(`📊 Snippets contain directory structure: ${directoryStructure}`);

//   const imports = evaluator.imports();
//   console.log(`📊 Snippets contain imports: ${imports}`);

//   const installs = evaluator.installs();
//   console.log(`📊 Snippets contain installations: ${installs}`);

//   const totalScore = (llmResult.total + snippetComplete + codeSnippetLength + multipleCodeSnippets + 
//     languageChecker + containsList + bibtexCitations + licenseInfo + directoryStructure + 
//     imports + installs) / 19;
//   console.log(`✅ Total quality score: ${totalScore} ✅`);
// }

if (require.main === module) {
program
  .requiredOption('--library <library>', 'Library name')
  .requiredOption('--url <url>', 'URL of source (Github repo, docs, llms.txt, etc.)')
  .requiredOption('--snippet <snippetUrl>', 'URL of context7 snippets')
  .action(async (options: { library: string; url: string; snippet: string }) => {
    await contextEvaluation(options.library, options.url, options.snippet);
  });

program.parse(process.argv);
}