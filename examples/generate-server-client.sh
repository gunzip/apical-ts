#!/bin/bash

# Script to generate both server and client code from OpenAPI spec

OPENAPI_FILE="./openapi.yaml"
OUTPUT_DIR="./generated"

echo "🚀 Generating server and client code from OpenAPI spec..."

# Clean up any existing generated code
if [ -d "$OUTPUT_DIR" ]; then
  rm -rf "$OUTPUT_DIR"
  echo "✅ Cleaned up existing generated code"
fi

# Run the generator with both server and client flags from project root
cd ..
pnpm start generate \
  --input "examples/$OPENAPI_FILE" \
  --output "examples/$OUTPUT_DIR" \
  --generate-server \
  --generate-client

if [ $? -eq 0 ]; then
  echo "✅ Code generation completed successfully!"
  echo "📁 Generated files in: examples/$OUTPUT_DIR/"
  
  # List the generated structure
  echo "📋 Generated structure:"
  cd examples
  find "$OUTPUT_DIR" -type d -name "*" | head -10 | sed 's/^/  - /'
else
  echo "❌ Generation failed!"
  exit 1
fi