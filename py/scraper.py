from github import Github, Auth
import os
from dotenv import dotenv_values
from google import genai
from playwright.sync_api import Page, expect, sync_playwright

config = dotenv_values(".env")

client = genai.Client(api_key=config["GEMINI_API_TOKEN"])
auth = Auth.Token(config["GITHUB_TOKEN"])
g = Github(auth=auth)

file_extensions = ["md", "mdx", "markdown", "rst", "ipynb", "texy", "adoc", "c7", "rdoc", "html", "htm", "txt", "org", "svx"]  # The extensions of the files we want to scrape

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
            contents.extend(repo.get_contents(file_content.path))
        else:
            # Only scrape files with the correct extension
            if file_content.path.split(".")[-1] in file_extensions:
                all_file_content.append(file_content.decoded_content.decode("utf-8"))

    return all_file_content

# TODO: This is a work in progress, needs to be finished
def website_scraper(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded")
        links = page.eval_on_selector_all("a[href]", "links => links.map(link => link.href)")
        for link in links:
            if link and "youtube" not in link:
                sub_page = page.goto(link.get("href"), wait_until="domcontentloaded")


website_scraper("https://react.dev/")