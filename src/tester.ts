import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { program } from 'commander';
import { Octokit } from '@octokit/core';
import { Evaluator } from './evaluator';
import { scrapeContext7Snippets } from './utils';
import fs from 'fs/promises';
import { createFile } from './main';

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

async function testFilePath(): Promise<void> {
  console.log('📊 Testing file_path...');
  const sourceToSnippetUrls = [
    'https://zh.d2l.ai/',
    'https://ctrl-plex.vercel.app/',
    'https://github.com/technomancy-dev/00',
    'https://github.com/jdan/98.css',
    'https://www.x.org/releases/current/doc/',
    'https://www.adaline.ai/docs/overview',
    'https://adk.wiki/',
    'https://biopython.org/wiki/Documentation',
  ];

  for (const url of sourceToSnippetUrls) {
    console.log(`📊 TESTING create_file ...`);
    try {
      const path = url.replace(/\//g, '\\');
      await fs.writeFile(`src/important_info/${path}.txt`, 'Google search results: ');
      console.log(`✅ Created file for ${url}`);
      await fs.unlink(`src/important_info/${path}.txt`);
      console.log(`✅ Removed file for ${url}`);
    } catch (error) {
      console.error(`❌ Error creating files for ${url}: ${error}`);
    }
  }
}

interface TestCase {
  [key: string]: number;
}

async function tester(urls: TestCase, funcToTest: string): Promise<void> {
  console.log(`📊 TESTING ${funcToTest}...`);

  for (const [llmsTxt, expectedSnippetNum] of Object.entries(urls)) {
    const snippets = await scrapeContext7Snippets(llmsTxt);
    const snippetNum = snippets.split('-'.repeat(40)).length;

    const evaluator = new Evaluator(client, snippets);
    const func = (evaluator as any)[funcToTest].bind(evaluator) as () => number;
    const score = func();
    const goldScore = ((snippetNum - expectedSnippetNum) / snippetNum) * 10;

    if (score !== goldScore) {
      console.log(`❌ ${llmsTxt}: ${score} (expected: ${goldScore})`);
    } else {
      console.log(`✅ ${llmsTxt}`);
    }
  }
}

// Expects the file to already exist under important_info/
async function llmEvaluateTester(): Promise<void> {
  console.log('📊 Testing LLM evaluate...');
  const urls = {"https://github.com/climblee/uv-ui": [2, 10, 10, 10, 10, 10, 7.5, 7.5],
                "https://github.com/long2ice/asynch": [10, 10, 9.2, 10, 10, 10, 10, 10]};

  for (const [url, scoreBreakdown] of Object.entries(urls)) {
    const scoreBreakdownTotal = scoreBreakdown.reduce((a, b) => a + b, 0);
    const path = url.replace(/\//g, '\\');
    const importantInfo = await fs.readFile(`src/important_info/${path}.txt`, 'utf8');
    const snippets = await scrapeContext7Snippets(url);
    const evaluator = new Evaluator(client, snippets);
    const llmResult = await evaluator.llmEvaluate(importantInfo);
  
    if (Math.abs(Number(llmResult.total) - scoreBreakdownTotal) <= 5) {
      console.log(`✅ LLM score matches human score of: ${llmResult.total}`);
    } else {
      console.log(`❌ LLM Score: ${llmResult.total} (expected: ${scoreBreakdownTotal})`);
      // TODO: Fix this line
      // console.log(`Difference per criterion: ${llmResult.scores.map((s, i) => Math.abs(Number(s) - scoreBreakdown[i])).join(', ')}`);
    }
  }
}

llmEvaluateTester();
console.log('--------------------------------');
testFilePath();
console.log('--------------------------------');
const testCases: { [key: string]: TestCase } = {
  snippetComplete: {
    'https://context7.com/steamre/steamkit/llms.txt?tokens=18483': 2, // Num of snippets with what we don't want
    'https://context7.com/1password/onepassword-sdk-js/llms.txt': 0,
  },
  codeSnippetLength: {
    'https://context7.com/eclipse-4diac/4diac-forte/llms.txt': 13,
    'https://context7.com/context7/coderabbitai_github_io-bitbucket/llms.txt': 1,
    'https://context7.com/context7/tailwindcss/llms.txt': 16,
    'https://context7.com/humanlayer/12-factor-agents/llms.txt': 29,
  },
  multipleCodeSnippets: {
    'https://context7.com/context7/tailwindcss/llms.txt': 9,
    'https://context7.com/1password/onepassword-sdk-js/llms.txt': 4,
    'https://context7.com/nvidia-omniverse/ext-7z/llms.txt': 3,
  },
  languageDesc: {
    'https://context7.com/eclipse-4diac/4diac-forte/llms.txt': 0,
    'https://context7.com/technomancy-dev/00/llms.txt': 0,
    'https://context7.com/pnxenopoulos/awpy/llms.txt': 7,
    'https://context7.com/aflplusplus/aflplusplus/llms.txt': 2,
  },
  containsList: {
    'https://context7.com/directus/directus/llms.txt?topic=1.&tokens=100000': 1,
    'https://context7.com/context7/ctrl-plex_vercel_app/llms.txt': 1,
    'https://context7.com/mhsanaei/3x-ui/llms.txt': 0,
    'https://context7.com/huntabyte/shadcn-svelte/llms.txt': 1,
  },
  bibtexCitations: {
    'https://context7.com/cleardusk/3ddfa_v2/llms.txt': 2,
    'https://context7.com/context7/zh_d2l_ai/llms.txt?tokens=53303': 1,
  },
  licenseInfo: {
    'https://context7.com/ralfbiedert/cheats.rs/llms.txt': 1,
    'https://context7.com/stanfordnlp/corenlp/llms.txt': 4,
    'https://context7.com/n8n-io/n8n-docs/llms.txt': 0,
  },
  directoryStructure: {
    'https://context7.com/context7/cuelang/llms.txt': 1,
    'https://context7.com/jpressprojects/jpress/llms.txt': 1,
    'https://context7.com/czelabueno/jai-workflow/llms.txt': 2,
    'https://context7.com/shadcn-ui/ui/llms.txt': 4,
  },
  imports: {
    'https://context7.com/shuvijs/shuvi/llms.txt': 0,
    'https://context7.com/adn-devtech/3dsmax-python-howtos/llms.txt': 8,
    'https://context7.com/sortablejs/sortable/llms.txt': 1,
    'https://context7.com/jawah/niquests/llms.txt': 1,
  },
  installs: {
    'https://context7.com/fbsamples/360-video-player-for-android/llms.txt': 1,
    'https://context7.com/wangluozhe/requests/llms.txt': 2,
    'https://context7.com/jawah/niquests/llms.txt': 2,
    'https://context7.com/theailanguage/a2a_samples/llms.txt': 4,
  },
};

program
  .command('test')
  .action(async () => {
    await testFilePath();
    console.log('--------------------------------');
    for (const test of Object.keys(testCases)) {
      await tester(testCases[test], test);
      console.log('--------------------------------');
    }
  });

program.parse(process.argv);
