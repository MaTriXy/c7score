import subprocess

class Linter:
    """Linters for each programming language"""

    def __init__(self, file_path):
        self.file_path = file_path
    
    # Mimics Pylint's score output
    def score_results(self, result, delimeter):
        with open(self.file_path, "r") as f:
            code = f.read()
        lines = len(code.split("\n"))
        num_errors = len(result.split(delimeter))
        score = max(0, 10 - ((num_errors / lines) * 10))
        return score

    def lint_python(self):
        disable_rules = "--disable=import-error,no-name-in-module,undefined-variable,missing-module-docstring,missing-final-newline,unused-import,used-before-assignment"
        result = subprocess.run(["pylint", self.file_path, disable_rules], encoding="utf-8", capture_output=True, text=True)
        final_ans = float(result.stdout.split("at ")[-1].split("/")[0])
        return final_ans
    
    def lint_c(self):
        disable_rules = "-check=*,-Wno-error=unused-command-line-argument"
        result = subprocess.run(["clang-tidy", self.file_path, disable_rules], encoding="utf-8", capture_output=True, text=True)

        # score outputs
        return self.score_results(result.stdout, "\n")

    def lint_shell(self):
        disable_rules = "SC2148"
        result = subprocess.run(["shellcheck", "-e", disable_rules, self.file_path], encoding="utf-8", capture_output=True, text=True)
    
        # score outputs
        return self.score_results(result.stdout, "^-")
    
    def lint_javascript(self):
        disable_rules = "-E0057"
        result = subprocess.run(["quick-lint-js", disable_rules, self.file_path], encoding="utf-8", capture_output=True, text=True)

        # score outputs
        return self.score_results(result.stderr, "\n")

