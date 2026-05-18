import {
  CallExpression,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
} from "ts-morph";

import type {
  ZodArg,
  ZodCallNode,
  ZodObjectProperty,
  ZodSchemaDeclaration,
} from "./types.js";

export interface ParsedFileResult {
  declarations: ZodSchemaDeclaration[];
  imports: Array<{ names: string[]; moduleSpecifier: string }>;
}

export function parseZodFile(filePath: string): ParsedFileResult {
  const project = new Project({ compilerOptions: { strict: true } });
  const sourceFile = project.addSourceFileAtPath(filePath);
  return parseSourceFile(sourceFile);
}

export function parseZodFiles(
  filePaths: string[],
): Map<string, ParsedFileResult> {
  const project = new Project({ compilerOptions: { strict: true } });
  const results = new Map<string, ParsedFileResult>();
  for (const filePath of filePaths) {
    const sourceFile = project.addSourceFileAtPath(filePath);
    results.set(filePath, parseSourceFile(sourceFile));
  }
  return results;
}

export function parseZodSource(content: string): ParsedFileResult {
  const project = new Project({
    compilerOptions: { strict: true },
    useInMemoryFileSystem: true,
  });
  const sourceFile = project.createSourceFile("input.ts", content);
  return parseSourceFile(sourceFile);
}

function parseSourceFile(sourceFile: SourceFile): {
  declarations: ZodSchemaDeclaration[];
  imports: Array<{ names: string[]; moduleSpecifier: string }>;
} {
  const declarations: ZodSchemaDeclaration[] = [];
  const imports: Array<{ names: string[]; moduleSpecifier: string }> = [];

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const namedImports = importDecl.getNamedImports().map((n) => n.getName());
    if (namedImports.length > 0) {
      imports.push({ names: namedImports, moduleSpecifier });
    }
  }

  const exportedTypeNames = new Set<string>();
  for (const typeAlias of sourceFile.getTypeAliases()) {
    if (typeAlias.isExported()) {
      exportedTypeNames.add(typeAlias.getName());
    }
  }

  for (const statement of sourceFile.getVariableStatements()) {
    const isExported = statement.isExported();
    for (const decl of statement.getDeclarations()) {
      const initializer = decl.getInitializer();
      if (!initializer) continue;

      if (isZodExpression(initializer)) {
        const name = decl.getName();
        const callChain = parseExpression(initializer);
        if (callChain) {
          declarations.push({
            name,
            isExported,
            hasTypeExport: exportedTypeNames.has(name),
            callChain,
          });
        }
      }
    }
  }

  return { declarations, imports };
}

function isZodExpression(node: Node): boolean {
  const text = node.getText();
  return (
    text.startsWith("z.") ||
    text.startsWith("(") ||
    isKnownSchemaReference(node)
  );
}

function isKnownSchemaReference(node: Node): boolean {
  if (Node.isIdentifier(node)) return true;
  if (Node.isCallExpression(node)) {
    const expr = node.getExpression();
    return isZodExpression(expr);
  }
  if (Node.isPropertyAccessExpression(node)) {
    return isZodExpression(node.getExpression());
  }
  if (Node.isParenthesizedExpression(node)) {
    const inner = node.getExpression();
    return isZodExpression(inner);
  }
  return false;
}

export function parseExpression(node: Node): ZodCallNode | undefined {
  if (Node.isParenthesizedExpression(node)) {
    return parseExpression(node.getExpression());
  }

  if (Node.isCallExpression(node)) {
    return parseCallExpression(node);
  }

  if (Node.isPropertyAccessExpression(node)) {
    const obj = parseExpression(node.getExpression());
    if (!obj) return undefined;
    return { kind: "property", object: obj, property: node.getName() };
  }

  if (Node.isIdentifier(node)) {
    const name = node.getText();
    if (name === "z") return { kind: "identifier", name: "z" };
    return { kind: "identifier", name };
  }

  return undefined;
}

function parseCallExpression(node: CallExpression): ZodCallNode | undefined {
  const expression = node.getExpression();
  const args = node.getArguments().map(parseArg).filter(Boolean) as ZodArg[];

  if (Node.isPropertyAccessExpression(expression)) {
    const methodName = expression.getName();
    const obj = parseExpression(expression.getExpression());
    if (!obj) return undefined;
    return { kind: "call", method: methodName, object: obj, args };
  }

  if (Node.isIdentifier(expression)) {
    const name = expression.getText();
    return { kind: "call", method: name, args };
  }

  return undefined;
}

function parseArg(node: Node): ZodArg | undefined {
  if (Node.isStringLiteral(node)) {
    return { kind: "string", value: node.getLiteralValue() };
  }

  if (Node.isNumericLiteral(node)) {
    return { kind: "number", value: node.getLiteralValue() };
  }

  if (node.getKind() === SyntaxKind.TrueKeyword) {
    return { kind: "boolean", value: true };
  }
  if (node.getKind() === SyntaxKind.FalseKeyword) {
    return { kind: "boolean", value: false };
  }

  if (node.getKind() === SyntaxKind.NullKeyword) {
    return { kind: "null" };
  }

  if (Node.isPrefixUnaryExpression(node)) {
    const operand = node.getOperand();
    if (
      node.getOperatorToken() === SyntaxKind.MinusToken &&
      Node.isNumericLiteral(operand)
    ) {
      return { kind: "number", value: -operand.getLiteralValue() };
    }
  }

  if (Node.isArrayLiteralExpression(node)) {
    const elements = node
      .getElements()
      .map(parseArg)
      .filter(Boolean) as ZodArg[];
    return { kind: "array", elements };
  }

  if (Node.isObjectLiteralExpression(node)) {
    const properties: ZodObjectProperty[] = [];
    for (const prop of node.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const key = prop.getName().replace(/^["']|["']$/g, "");
        const valueNode = prop.getInitializer();
        if (valueNode) {
          const parsed = parseExpression(valueNode);
          if (parsed) {
            properties.push({ key, value: parsed });
          }
        }
      } else if (Node.isSpreadAssignment(prop)) {
        const expr = prop.getExpression();
        if (Node.isPropertyAccessExpression(expr)) {
          const obj = parseExpression(expr.getExpression());
          if (obj) {
            return {
              kind: "spread",
              node: obj,
              property: expr.getName(),
            } as ZodArg;
          }
        }
      }
    }
    return { kind: "object", properties };
  }

  if (Node.isArrowFunction(node)) {
    const body = node.getBody();
    if (Node.isCallExpression(body) || Node.isIdentifier(body)) {
      const parsed = parseExpression(body);
      if (parsed) {
        return { kind: "arrow", bodyNode: parsed };
      }
    }
    if (Node.isParenthesizedExpression(body)) {
      const parsed = parseExpression(body.getExpression());
      if (parsed) {
        return { kind: "arrow", bodyNode: parsed };
      }
    }
    return undefined;
  }

  if (
    Node.isCallExpression(node) ||
    Node.isPropertyAccessExpression(node) ||
    Node.isIdentifier(node)
  ) {
    const parsed = parseExpression(node);
    if (parsed) {
      return { kind: "call", node: parsed };
    }
  }

  if (Node.isParenthesizedExpression(node)) {
    const inner = node.getExpression();
    const parsed = parseExpression(inner);
    if (parsed) {
      return { kind: "call", node: parsed };
    }
  }

  return undefined;
}
