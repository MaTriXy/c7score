from github import Github, Auth
import os
from dotenv import dotenv_values
from google import genai
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--url", type=str, nargs="+", required=True, help="The URL of the Github repo to scrape")
args = parser.parse_args()

urls = args.url
config = dotenv_values(".env")

client = genai.Client(api_key=config["GEMINI_API_TOKEN"])
auth = Auth.Token(config["GITHUB_TOKEN"])
g = Github(auth=auth)

file_extensions = ["md", "mdx", "markdown", "rst", "ipynb", "texy", "adoc", "c7", "rdoc", "html", "htm", "txt", "org", "svx"]  # The extensions of the files we want to scrape

# Scrapes all files from the Github repo and writes them to a file
def scraper(urls):
    files_scraped = {}
    for url in urls:
        all_files_content = []
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
                    all_files_content.append(file_content.decoded_content.decode("utf-8"))
        files_scraped[url] = all_files_content
        # Write to file for easy access
        extracted_info = extract_important_info(all_files_content)
        formatted_url = url.split("github.com/")[-1].replace("/", "_")
        print(f"📝 Writing to important_info/{formatted_url}.txt")
        with open(f"important_info/{formatted_url}.txt", "w") as f:
            f.write(extracted_info)

    return files_scraped

def extract_important_info(all_files_content):
    prompt = f"""Given the following list of files from a Github repo, determine the top 10 most important pieces of information. 
    This information can be code snippets or examples. It also may or may not have supplmentary text providing
    background. Make sure to divide up each of the pieces of information into separate sections using "---".
    
    Files: {all_files_content}
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash", contents=prompt
    )
    return response.text

files_scraped = scraper(urls)
print(f"📊 Number of files scraped: ", {key: len(value) for key, value in files_scraped.items()})
