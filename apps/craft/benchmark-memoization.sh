#!/bin/bash

# Performance comparison script for memoization optimization
# This script runs the generator on a large OpenAPI spec and compares timing

set -e

SPEC_FILE="${1:-../../local/klaviyo.local.json}"
OUTPUT_DIR_BASELINE="/tmp/craft-baseline"
OUTPUT_DIR_MEMOIZED="/tmp/craft-memoized"
ITERATIONS="${2:-3}"

if [ ! -f "$SPEC_FILE" ]; then
  echo "❌ Error: OpenAPI spec file not found: $SPEC_FILE"
  echo "Usage: $0 [spec-file] [iterations]"
  exit 1
fi

echo "🔬 Memoization Performance Benchmark"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Spec: $SPEC_FILE"
echo "Iterations: $ITERATIONS"
echo ""

# Function to run generation and extract timing
run_benchmark() {
  local output_dir=$1
  local label=$2
  
  echo "Running $label..."
  
  # Clean output directory
  rm -rf "$output_dir"
  
  local total_time=0
  local parse_times=()
  local schema_times=()
  local client_times=()
  local total_times=()
  
  for i in $(seq 1 $ITERATIONS); do
    echo -n "  Iteration $i/$ITERATIONS... "
    
    # Capture output with timing
    local output=$(node dist/index.js generate -i "$SPEC_FILE" -o "$output_dir" --client --profile 2>&1)
    
    # Extract timing values (assumes format: "- phase: XX.XX ms")
    local parse_time=$(echo "$output" | grep -E "parse\+preprocess:" | sed -E 's/.*: ([0-9.]+) ms/\1/')
    local schema_time=$(echo "$output" | grep -E "schemas:all:" | sed -E 's/.*: ([0-9.]+) ms/\1/')
    local client_time=$(echo "$output" | grep -E "client-operations:" | sed -E 's/.*: ([0-9.]+) ms/\1/')
    local total_time=$(echo "$output" | grep -E "Total \(wall\):" | sed -E 's/.*: ([0-9.]+) ms/\1/')
    
    parse_times+=($parse_time)
    schema_times+=($schema_time)
    client_times+=($client_time)
    total_times+=($total_time)
    
    echo "✓ (${total_time}ms)"
  done
  
  echo ""
  
  # Calculate averages
  local parse_avg=$(printf '%s\n' "${parse_times[@]}" | awk '{s+=$1} END {print s/NR}')
  local schema_avg=$(printf '%s\n' "${schema_times[@]}" | awk '{s+=$1} END {print s/NR}')
  local client_avg=$(printf '%s\n' "${client_times[@]}" | awk '{s+=$1} END {print s/NR}')
  local total_avg=$(printf '%s\n' "${total_times[@]}" | awk '{s+=$1} END {print s/NR}')
  
  echo "$label Results (average of $ITERATIONS runs):"
  echo "  Parse + Preprocess: $parse_avg ms"
  echo "  Schema Generation:  $schema_avg ms"
  echo "  Client Operations:  $client_avg ms"
  echo "  Total (wall time):  $total_avg ms"
  echo ""
  
  # Return total average for comparison
  echo "$total_avg"
}

# Check if we're comparing against a baseline or just showing current performance
if git show HEAD~1:apps/craft/src/schema-generator/utils.ts 2>/dev/null | grep -q "memoizee"; then
  # Already has memoization in previous commit, just show current performance
  echo "⚡ Current implementation (WITH memoization):"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  current_time=$(run_benchmark "$OUTPUT_DIR_MEMOIZED" "Memoized")
  
  echo "✅ Benchmark complete!"
  echo "   Average total time: ${current_time}ms"
else
  # Has memoization now but not before - show comparison
  echo "📊 Running performance comparison..."
  echo ""
  
  # Store current memoized version
  git stash -u
  
  echo "1️⃣  Baseline (WITHOUT memoization):"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  # Rebuild without memoization
  pnpm run build > /dev/null 2>&1
  baseline_time=$(run_benchmark "$OUTPUT_DIR_BASELINE" "Baseline")
  
  # Restore memoized version
  git stash pop
  
  echo "2️⃣  Optimized (WITH memoization):"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  # Rebuild with memoization
  pnpm run build > /dev/null 2>&1
  memoized_time=$(run_benchmark "$OUTPUT_DIR_MEMOIZED" "Memoized")
  
  echo "📈 Performance Comparison:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Baseline:  ${baseline_time}ms"
  echo "Memoized:  ${memoized_time}ms"
  
  # Calculate improvement
  improvement=$(echo "scale=2; (($baseline_time - $memoized_time) / $baseline_time) * 100" | bc)
  time_saved=$(echo "scale=2; $baseline_time - $memoized_time" | bc)
  
  if (( $(echo "$improvement > 0" | bc -l) )); then
    echo "Improvement: ${improvement}% faster (saved ${time_saved}ms)"
  else
    echo "Change: ${improvement}% (${time_saved}ms difference)"
  fi
fi

echo ""
echo "🏁 Benchmark complete!"
