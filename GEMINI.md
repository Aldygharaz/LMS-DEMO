<!-- context7 -->
Use Context7 MCP for all external libraries, SDKs, frameworks, APIs, CLI tools, and config documentation to ensure usage of the latest/up-to-date tech stack, modern APIs, and current package versions instead of web search or outdated training data. Do not use for general logic or refactoring.
1. Call resolve-library-id(name, query) -> select best matching /org/project (always target the latest stable version/branch).
2. Call query-docs(libraryId, conceptQuery) -> query single concept per call with current/modern syntax.
3. Implement code and answer using fetched official modern documentation.
<!-- context7 -->
