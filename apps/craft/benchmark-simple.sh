#!/bin/bash

# Simple performance benchmark for current implementation
# This runs the generator multiple times and reports average timing

set -e

SPEC_FILE="${1:-../../local/klaviyo.local.json}"
OUTPUT_DIR="/tmp/craft-benchmark-$(date +%s)"
ITERATIONS="${2:-3}"

if [ ! -f "$SPEC_FILE" ]; then
  echo "❌ Error: OpenAPI spec file not found: $SPEC_FILE"
  echo "Usage: $0 [spec-file] [iterations]"
  exit 1
fi

echo "🔬 Performance Benchmark (with memoization)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Spec: $SPEC_FILE"
echo "Iterations: $ITERATIONS"
echo ""

parse_times=()
schema_times=()
client_times=()
package_times=()
total_times=()

for i in $(seq 1 $ITERATIONS); do
  echo "Running iteration $i/$ITERATIONS..."
  
  # Clean output directory
  rm -rf "$OUTPUT_DIR"
  
  # Capture output with timing
  output=$(node dist/index.js generate -i "$SPEC_FILE" -o "$OUTPUT_DIR" --client --profile 2>&1)
  
  # Extract timing values
  parse_time=$(echo "$output" | grep -E "parse\+preprocess:" | sed -E 's/.*: ([0-9.]+) ms/\1/' || echo "0")
  schema_time=$(echo "$output" | grep -E "schemas:all:" | sed -E 's/.*: ([0-9.]+) ms/\1/' || echo "0")
  client_time=$(echo "$output" | grep -E "client-operations:" | sed -E 's/.*: ([0-9.]+) ms/\1/' || echo "0")
  package_time=$(echo "$output" | grep -E "package-json:" | sed -E 's/.*: ([0-9.]+) ms/\1/' || echo "0")
  total_time=$(echo "$output" | grep -E "Total \(wall\):" | sed -E 's/.*: ([0-9.]+) ms/\1/' || echo "0")
  
  parse_times+=($parse_time)
  schema_times+=($schema_time)
  client_times+=($client_time)
  package_times+=($package_time)
  total_times+=($total_time)
  
  echo "  ✓ Completed in ${total_time}ms"
  echo ""
done

# Calculate averages
parse_avg=$(printf '%s\n' "${parse_times[@]}" | awk '{s+=$1} END {print s/NR}')
schema_avg=$(printf '%s\n' "${schema_times[@]}" | awk '{s+=$1} END {print s/NR}')
client_avg=$(printf '%s\n' "${client_times[@]}" | awk '{s+=$1} END {print s/NR}')
package_avg=$(printf '%s\n' "${package_times[@]}" | awk '{s+=$1} END {print s/NR}')
total_avg=$(printf '%s\n' "${total_times[@]}" | awk '{s+=$1} END {print s/NR}')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results (average of $ITERATIONS runs):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "  Parse + Preprocess: %8.2f ms\n" $parse_avg
printf "  Schema Generation:  %8.2f ms\n" $schema_avg
printf "  Client Operations:  %8.2f ms\n" $client_avg
printf "  Package JSON:       %8.2f ms\n" $package_avg
printf "  ─────────────────────────────\n"
printf "  Total (wall time):  %8.2f ms\n" $total_avg
echo ""
echo "🏁 Benchmark complete!"
echo "   Output: $OUTPUT_DIR"
