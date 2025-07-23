import os
from dotenv import dotenv_values
from google import genai
import argparse
from google.genai import types
from github import Github, Auth
from search import Search
from evaluator import Evaluator
from utils import scrape_context7_snippets
from main import create_file
import os
import ast

env_config = dotenv_values(".env")

client = genai.Client(api_key=env_config["GEMINI_API_TOKEN"])
auth = Auth.Token(env_config["GITHUB_TOKEN"])
g = Github(auth=auth)


def test_file_path():
    print("📊 Testing file_path...")
    source_to_snippet_urls = [
                "https://zh.d2l.ai/",
                "https://ctrl-plex.vercel.app/",
                "https://github.com/technomancy-dev/00",
                "https://github.com/jdan/98.css",
                "https://www.x.org/releases/current/doc/",
                "https://www.adaline.ai/docs/overview",
                "https://adk.wiki/",
                "https://biopython.org/wiki/Documentation"
]
    for url in source_to_snippet_urls:
        print(f"📊 TESTING create_file ...")
        try:
            path = url.replace("/", "\\")
            with open(f"py/important_info/{path}.txt", "w") as f:
                f.write(f"Google search results: ")
            print(f"✅ Created file for {url}")
            os.remove(f'py/important_info/{path}.txt')
            print(f"✅ Removed file for {url}")
        except Exception as e:
            print(f"❌ Error creating files for {url}: {e}")

def tester(urls, func_to_test: str):
    print(f"📊 TESTING {func_to_test}...")

    for llms_txt, expected_snippet_num in urls.items():
        snippets = scrape_context7_snippets(llms_txt)
        snippet_num = len(snippets.split("-" * 40))

        func = getattr(Evaluator(client, snippets), func_to_test)
        score = func()
        gold_score = ((snippet_num - expected_snippet_num) / (snippet_num)) * 10
        if score != gold_score:
            print(f"❌ {llms_txt}: {score} (expected: {gold_score})")
        else:
            print(f"✅ {llms_txt}")

# Determines how well the LLM aligns with human eval
def llm_evaluate_tester():
    print("📊 Testing LLM evaluate...")
    urls = {"https://github.com/climblee/uv-ui": [2, 10, 10, 10, 10, 10, 7.5, 7.5],
            "https://github.com/long2ice/asynch": [10, 10, 9.2, 10, 10, 10, 10, 10]}
    
    for url, score_breakdown in urls.items():
        score_breakdown_total = sum(score_breakdown)
        create_file(url)
        path = url.replace("/", "\\")
        with open(f"py/important_info/{path}.txt", "r") as f:
            important_info = f.read()
        snippets = scrape_context7_snippets(url)
        evaluator = Evaluator(client, snippets)
        llm_score, llm_total, llm_explanation = evaluator.llm_evaluate(important_info)
        if abs(llm_total - score_breakdown_total) <= 5:
            print(f"✅ LLM score matches human score of: {llm_total}")
            print(f"LLM explanation: {llm_explanation}")
        else:
            print(f"❌ LLM Score: {llm_total} (expected: {score_breakdown_total})")
            print(f"Difference per criterion: {[abs(list1 - list2) for list1, list2 in zip(llm_score, score_breakdown)]}")

def test_linter():
    print("📊 Testing linter...")
    urls = ["https://context7.com/aflplusplus/aflplusplus/llms.txt", # C & C++ & Shell
            "https://context7.com/harrisonkramer/optiland/llms.txt", # Python
            
            ]
    for url in urls:
        snippets = scrape_context7_snippets(url)
        snippet_num = len(snippets.split("-" * 40))
        func = getattr(Evaluator(client, snippets), "syntax_eval")
        score = func()
        print(f"✅ {url}: {score}")

llm_evaluate_tester()
print("--------------------------------")
# test_file_path()
# print("--------------------------------")
# test_linter()
# print("--------------------------------")
# test_cases = {
#     "snippet_complete": {"https://context7.com/steamre/steamkit/llms.txt?tokens=18483": 2,
#                 "https://context7.com/1password/onepassword-sdk-js/llms.txt": 0    
#     },
#     "code_snippet_length": {"https://context7.com/eclipse-4diac/4diac-forte/llms.txt": 13,
#                             "https://context7.com/context7/coderabbitai_github_io-bitbucket/llms.txt": 1,
#                             "https://context7.com/context7/tailwindcss/llms.txt": 16,
#                             "https://context7.com/humanlayer/12-factor-agents/llms.txt": 29,
#     },
#     "multiple_code_snippets": {"https://context7.com/context7/tailwindcss/llms.txt": 9,
#                                "https://context7.com/1password/onepassword-sdk-js/llms.txt": 4,
#                                "https://context7.com/nvidia-omniverse/ext-7z/llms.txt": 3,
#     },
#     "language_desc": {"https://context7.com/eclipse-4diac/4diac-forte/llms.txt": 0,
#                       "https://context7.com/technomancy-dev/00/llms.txt": 0,
#                       "https://context7.com/pnxenopoulos/awpy/llms.txt": 7,
#                       "https://context7.com/aflplusplus/aflplusplus/llms.txt": 2,
#     },
#     "contains_list": {"https://context7.com/huntabyte/shadcn-svelte/llms.txt": 0,
#                     "https://context7.com/directus/directus/llms.txt?topic=1.&tokens=100000": 1,
#                     "https://context7.com/context7/ctrl-plex_vercel_app/llms.txt": 1,
#                     "https://context7.com/mhsanaei/3x-ui/llms.txt": 0,
                    
#     },
#     "bibtex_citations": {"https://context7.com/cleardusk/3ddfa_v2/llms.txt": 2,
#                          "https://context7.com/context7/zh_d2l_ai/llms.txt?tokens=53303": 1 
#     },
#     "license_info": {"https://context7.com/ralfbiedert/cheats.rs/llms.txt": 1,
#                     "https://context7.com/stanfordnlp/corenlp/llms.txt": 4,
#                     "https://context7.com/n8n-io/n8n-docs/llms.txt": 0
    
#     },
#     "directory_structure": {"https://context7.com/context7/cuelang/llms.txt": 1,
#                             "https://context7.com/jpressprojects/jpress/llms.txt": 1,
#                             "https://context7.com/czelabueno/jai-workflow/llms.txt": 2,
#                             "https://context7.com/shadcn-ui/ui/llms.txt": 1,
#     },
#     "imports": {"https://context7.com/shuvijs/shuvi/llms.txt": 0,
#                 "https://context7.com/adn-devtech/3dsmax-python-howtos/llms.txt": 8,
#                 "https://context7.com/sortablejs/sortable/llms.txt": 1,
#                 "https://context7.com/jawah/niquests/llms.txt": 1
#     },
#     "installs": {"https://context7.com/fbsamples/360-video-player-for-android/llms.txt": 1,
#                 "https://context7.com/wangluozhe/requests/llms.txt": 2,
#                 "https://context7.com/jawah/niquests/llms.txt": 2,
#                 "https://context7.com/theailanguage/a2a_samples/llms.txt": 4,
#     }
# }
# for test in test_cases:
#     tester(test_cases[test], test)
#     print("--------------------------------")

