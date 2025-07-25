class Search:
    def __init__(self, url: str, client: str, model_config: str):
        self.url = url
        self.client = client
        self.model_config = model_config

    # Determines relevant information using Google search of library + provided URL
    def relevant_info(self):
        prompt = f"""
        Summarize the 10 most important code snippets from 
        the URL, {self.url}, that would help you use the 
        library while coding.
        
        Focus on techninal examples that demonstrate implementation. 
        Prioritize the snippets in the following order of importance: 

        1. Core Functionality: Examples of the primary functions or methods
        that perform the library's main task.
        2. Common Configuration: Examples of how to customize the library's 
        default settings.

        Do NOT include non-implementation details, such as the library's license, 
        development setup, file structure, or installation procedures.

        You may use the url context tool to access the content of {self.url}, 
        or one of the links from the provided URL. 
        If the provided URL links to other websites, you may use those 
        sources to extract code snippets or additonal information. 

        Double check that the information is relevant to the library and not just general 
        information about it.

        Summarize your findings as a numbered list of 10 well-formatted 
        code blocks.

        I have confirmed that the URL provided is valid and accessible.
        """
        # Add a check to see if the prompt is too long
        total_tokens = self.client.models.count_tokens(
            model="gemini-2.5-pro", contents=prompt
        ).total_tokens
        if total_tokens < 1048576:  # 1048576 is the max tokens for Gemini 2.5 Pro
            response = self.client.models.generate_content(
                model="gemini-2.5-pro",
                contents=prompt,
                config=self.model_config
            )
            return response.text
        
        else:
            print("Prompt is too long, skipping LLM evaluation")
            return "Prompt is too long, skipped search for information retrieval", "Prompt is too long, skipped search for information retrieval"