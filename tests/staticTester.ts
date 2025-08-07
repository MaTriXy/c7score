import { config } from 'dotenv';
import { program } from 'commander';
import * as staticMetrics from '../src/staticMetrics';
import { scrapeContext7Snippets } from '../src/utils';

// Note: test URL information may change when snippets are refreshed on website

config();

const envConfig = {
  CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
};

const headerConfig = {
  headers: {
    "Authorization": "Bearer " + envConfig.CONTEXT7_API_TOKEN
  }
}

async function staticTester(): Promise<void> {
  for (const [metricName, libraries] of Object.entries(testCases)) {
    for (const [library, answer] of Object.entries(libraries)) {
      const scrapedSnippets = await scrapeContext7Snippets(library, headerConfig);
      const snippets = scrapedSnippets.split('-'.repeat(40));
      if (snippets.some(snippet => (staticMetrics as any)[metricName](snippet)) === answer) {
        console.log(`✅ ${metricName} is correct for ${library}`);
      } else {
        console.log(`❌ ${metricName} is incorrect for ${library}`);
      }
    }
  }
}

const testCases: { [key: string]: Record<string, boolean> } = {
  snippetIncomplete: {
    'steamre/steamkit': true,
    '/1password/onepassword-sdk-js': false,
  },
  codeSnippetLength: {
    '/eclipse-4diac/4diac-forte': true,
    '/context7/coderabbitai_github_io-bitbucket': true,
    '/context7/tailwindcss': true,
    '/humanlayer/12-factor-agents': true,
  },
  multipleCode: {
    '/context7/tailwindcss': true,
    '/1password/onepassword-sdk-js': true,
    '/nvidia-omniverse/ext-7z': true,
  },
  languageDesc: {
    '/eclipse-4diac/4diac-forte': true,
    '/technomancy-dev/00': true,
    '/pnxenopoulos/awpy': true,
    '/aflplusplus/aflplusplus': false,
  },
  containsList: {
    '/directus/directus': true,
    '/context7/ctrl-plex_vercel_app': true,
    '/mhsanaei/3x-ui': false,
  },
  citations: {
    '/cleardusk/3ddfa_v2': true,
    '/context7/zh_d2l_ai': false,
  },
  licenseInfo: {
    '/ralfbiedert/cheats.rs': true,
    '/stanfordnlp/corenlp': true,
    '/n8n-io/n8n-docs': false,
  },
  directoryStructure: {
    '/shadcn-ui/ui': false,
    '/context7/cuelang': true,
    '/jpressprojects/jpress': false,
    '/czelabueno/jai-workflow': true,
  },
  imports: {
    '/shuvijs/shuvi': false,
    '/adn-devtech/3dsmax-python-howtos': true,
    '/sortablejs/sortable': true,
    '/jawah/niquests': true,
  },
  installs: {
    '/fbsamples/360-video-player-for-android': true,
    '/wangluozhe/requests': true,
    '/jawah/niquests': true,
    '/theailanguage/a2a_samples': true,
  },
};

program
  .action(() => {
    staticTester();
  });

program.parse(process.argv);