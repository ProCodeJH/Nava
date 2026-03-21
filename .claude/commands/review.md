Perform a thorough code review on the specified file or recent changes:

1. **Architecture**: Does the code follow existing patterns? Any unnecessary complexity?
2. **Security**: OWASP Top 10 check — XSS, injection, auth issues, secrets exposure
3. **Performance**: N+1 queries, unnecessary re-renders, memory leaks, blocking operations
4. **Error Handling**: Proper error boundaries, no silent failures, graceful degradation
5. **Type Safety**: Missing types, any casts, unsafe assertions
6. **Testing**: Are critical paths covered? Edge cases?
7. **Naming**: Clear, consistent naming conventions

Score each category /10. Overall score /100.
Provide specific line-by-line feedback for issues found.
Korean 반말, concise.
