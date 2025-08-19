import { program } from 'commander';
import * as textMetrics from '../src/lib/textMetrics';
import { scrapeContext7Snippets } from '../src/services/context7';
import { buildContext7Header } from '../src/config/header';
import { validateEnv } from '../src/config/envValidator';

// Note: test URL information may change when snippets are refreshed on website

const envConfig = validateEnv();

const headerConfig = buildContext7Header(envConfig.CONTEXT7_API_TOKEN);

async function textMetricsTester(): Promise<void> {
    for (const [metricName, libraries] of Object.entries(testCases)) {
        for (const [library, answer] of Object.entries(libraries)) {
            const scrapedSnippets = await scrapeContext7Snippets(library, headerConfig);
            const snippets = scrapedSnippets.split('-'.repeat(40));
            if (snippets.some(snippet => (textMetrics as any)[metricName](snippet)) === answer) {
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
        'steamre/steamkit': true,
        '/eclipse-4diac/4diac-forte': true,
        '/context7/coderabbitai_github_io-bitbucket': true,
        '/context7/tailwindcss': true,
        '/humanlayer/12-factor-agents': true,
    },
    multipleCode: {
        '/websites/tailwindcss-com_vercel_app': false,
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
        '/mhsanaei/3x-ui': true,
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
        textMetricsTester();
    });

program.parse(process.argv);