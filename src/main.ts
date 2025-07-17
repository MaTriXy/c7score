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

// Web search tools
const groundingTool = {
  functionDeclarations: [{ name: 'googleSearch', description: 'Search Google for relevant information' }],
};
const urlContextTool = {
  functionDeclarations: [{ name: 'urlContext', description: 'Retrieve context from a URL' }],
};

const modelConfig: GenerateContentConfig = {
  tools: [groundingTool, urlContextTool],
};


export async function createFile(url: string): Promise<void> {
  const search = new Search(url, { generateContent: client.models.generateContent.bind(client.models) }, modelConfig);
  let searchResponse = await search.googleSearch();
  
  // Gemini has bug where it sometimes returns None
  // https://github.com/googleapis/python-genai/issues/1039
  
  if (searchResponse == null) {
    // Retry generation
    searchResponse = await search.googleSearch();
  }

  const filePath = url.replace(/\//g, '\\');
  await fs.writeFile(`src/important_info/${filePath}.txt`, `Google search results: ${searchResponse.text}`);
}

async function scoreFile(url: string, snippetUrl: string): Promise<void> {
  console.log('📊 Scoring ...');
  const filePath = url.replace(/\//g, '\\');
  let importantInfo: string;

  try {
    importantInfo = await fs.readFile(`src/important_info/${filePath}.txt`, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return;
  }

  const snippets = await scrapeContext7Snippets(snippetUrl);
  const evaluator = new Evaluator(
    {
      models: {
        generateContent: async (params: GenerateContentParameters) => {
          const response = await client.models.generateContent(params);
          return { text: response.text };
        },
      },
    },
    snippets
  );

  // Evaluation tests

  const llmResult = await evaluator.llmEvaluate(importantInfo);
  console.log(`📋 LLM Score breakdown: ${llmResult.scores}`);
  console.log(`📊 Snippets contain important info and syntactically correct ${url}: ${llmResult.total}`);

  const snippetComplete = evaluator.snippetComplete();
  console.log(`📊 Snippets contain all the required components: ${snippetComplete}`);

  const codeSnippetLength = evaluator.codeSnippetLength();
  console.log(`📊 Code snippets contain meaningful information: ${codeSnippetLength}`);

  const multipleCodeSnippets = evaluator.multipleCodeSnippets();
  console.log(`📊 Each snippet has only one code snippet: ${multipleCodeSnippets}`);

  const languageChecker = evaluator.languageDesc();
  console.log(`📊 Languages are proper and not just descriptions or console outputs: ${languageChecker}`);

  const containsList = evaluator.containsList();
  console.log(`📊 APIDOC code is not just a list: ${containsList}`);

  const bibtexCitations = evaluator.bibtexCitations();
  console.log(`📊 Snippets contain bibtex citations: ${bibtexCitations}`);

  const licenseInfo = evaluator.licenseInfo();
  console.log(`📊 Snippets contain license information: ${licenseInfo}`);

  const directoryStructure = evaluator.directoryStructure();
  console.log(`📊 Snippets contain directory structure: ${directoryStructure}`);

  const imports = evaluator.imports();
  console.log(`📊 Snippets contain imports: ${imports}`);

  const installs = evaluator.installs();
  console.log(`📊 Snippets contain installations: ${installs}`);

  const totalScore = (parseFloat(llmResult.total) + snippetComplete + codeSnippetLength + multipleCodeSnippets + 
    languageChecker + containsList + bibtexCitations + licenseInfo + directoryStructure + 
    imports + installs) / 90;
  console.log(`✅ Total quality score: ${totalScore} ✅`);
}

program
  .requiredOption('--url <url>', 'URL of source (Github repo, docs, llms.txt, etc.)')
  .requiredOption('--snippet <snippetUrl>', 'URL of context7 snippets')
  .action(async (options: { url: string; snippet: string }) => {
    await createFile(options.url);
    await scoreFile(options.url, options.snippet);
  });

program.parse(process.argv);