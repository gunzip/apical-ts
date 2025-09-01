---
applyTo: "**"
---

To create effective unit tests for a TypeScript project, you should provide GitHub Copilot with clear guidelines that focus on best practices. Here are five points you can share with Copilot.

## Test Behavior, Not Implementation

Focus on **what** the code does, not **how** it does it. Your tests should interact with the public API of the function or class and assert the outcomes. This approach makes your tests more robust and less likely to break when you refactor the internal logic.

- **Bad Example:** Testing if a private helper method was called.
- **Good Example:** Testing if the function returns the expected output for a given input.

## Keep Tests Simple and Focused

Each test should have a single responsibility. Use the **Arrange-Act-Assert** pattern to structure your tests:

- **Arrange:** Set up the necessary data and environment.
- **Act:** Call the function or method being tested.
- **Assert:** Verify that the result is what you expect.

This makes tests easier to read, understand, and debug.

## Use Descriptive Naming

Use clear and descriptive names for your test files, suites, and individual tests. This helps other developers (and your future self) understand what each test is for without having to read the code.

- **File Name:** `user.service.test.ts`
- **Test Suite:** `describe('UserService', () => { ... });`
- **Test Case:** `it('should add a new user to the database', () => { ... });`

## Isolate the Unit Under Test

To ensure your tests are true unit tests, you should isolate the code being tested from its dependencies. Use **mocks, stubs, and spies** for external services, API calls, or database interactions. This prevents your unit tests from failing due to external factors and makes them run faster.

## Test Edge Cases and Error Handling

A good test suite covers more than just the happy path. Make sure to test:

- **Edge cases:** Null, undefined, empty strings, zero, and boundary values.
- **Error handling:** How the code behaves when something goes wrong (e.g., an invalid input, a rejected promise, or an unexpected error).

## Maintain a Logical Structure

Organize your tests into different files or directories based on their purpose or domain. This improves maintainability and makes it easier to navigate a large codebase. For example, you can create separate folders for `authentication`, `security`, or `validation` tests. This modular approach keeps related tests together and prevents your test directory from becoming a flat, unmanageable list of files.

These guidelines will help you and Copilot generate more reliable and maintainable unit tests for your TypeScript project.
