class Search:
    def __init__(self, url: str, client: str, model_config: str):
        self.url = url
        self.library = url.split("github.com/")[-1].replace("/", " ")
        self.client = client
        self.model_config = model_config

    # Determines relevant information using Google search of library + provided URL
    def google_search(self):
        prompt = f"""Determine the most crucial technical information from 
        {self.library}, which has the URL, {self.url}, that would help you 
        use it when coding. Some examples of technical 
        information include, but are not limited to example implementations 
        and commonly used classes. The technical information 
        should be helpful when implementing and using the library in code, and not 
        just general information about it. For example, DO NOT include information 
        about the library's license, development setup, file structure, etc. 
        You CAN include code chunks if they are important to the library, but only 
        from {self.url}. 

        Present your response as a numbered list of roughly 10 pieces of information. 
        Each item must have a clear heading with between 1-5 sentences and no more than 
        one code snippet. The code snippet should be formatted as a code block. 

        You may search for the library name using search tools and access the content 
        using the url context tool if needed. You may also use the url context tool 
        to access the content of the provided URL. You are not limited to the link 
        provided and may search for more information if needed, however, code MUST ONLY 
        come from {self.url}. If that page links to other websites, you may use those 
        sources to extract code snippets or additonal information.
        """
        response = self.client.models.generate_content(
            model="gemini-2.5-pro",
            contents=prompt,
            config=self.model_config
        )
        return response
