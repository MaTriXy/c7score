from github import Github, Auth
import os
from dotenv import dotenv_values
from google import genai
from playwright.sync_api import sync_playwright
import time
from urllib.parse import urlparse
import re

config = dotenv_values(".env")

client = genai.Client(api_key=config["GEMINI_API_TOKEN"])
auth = Auth.Token(config["GITHUB_TOKEN"])
g = Github(auth=auth)

file_extensions = ["md", "mdx", "markdown", "rst", "ipynb", "texy", "adoc", "c7", "rdoc", "html", "htm", "txt", "org", "svx"]

# Scrapes all files from the Github repo and writes them to a file
def github_scraper(url):
    all_file_content = []
    formatted_url = url.split("github.com/")[-1]
    repo = g.get_repo(formatted_url)
    contents = repo.get_contents("")
    # Recursively iterates through all files in the repo
    while contents:
        file_content = contents.pop(0)
        if file_content.type == "dir":
            content = repo.get_contents(file_content.path)
            contents.extend(content)
        else:
            # Only scrape files with the correct extension
            if file_content.path.split(".")[-1] in file_extensions:
                content = file_content.decoded_content.decode("utf-8")
                matches = re.findall(r"```[^\n]*\n([\s\S]+?)```", content)
                if matches != []:
                    all_file_content.extend(matches)
    return all_file_content

def website_scraper(url):
    already_scraped = []
    scraped_content = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded")
        code_snippets = page.eval_on_selector_all(
            "pre > code",
            "snippets => snippets.map(b => b.innerText)"
        )
        scraped_content.extend(code_snippets)
        already_scraped.append(url)

        links = page.eval_on_selector_all("a[href]", "links => links.map(link => link.href)")
        for link in links:
            time.sleep(5)
            if link not in already_scraped and urlparse(link).netloc == urlparse(url).netloc:
                page.goto(link, wait_until="domcontentloaded")
                code_snippets = page.eval_on_selector_all(
                    "pre > code",
                    "snippets => snippets.map(b => b.innerText)"
                )
                scraped_content.extend(code_snippets)
                already_scraped.append(link)
    return scraped_content
