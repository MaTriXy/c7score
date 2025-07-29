import requests

def scrape_context7_snippets(context7_url):
    """Gets snippets from llms.txt on context7"""
    response = requests.get(context7_url)
    snippets = str(response.text)
    return snippets
