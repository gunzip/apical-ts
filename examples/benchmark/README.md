# yanogen-ts Performance Benchmarks

This directory contains performance and memory benchmarking scripts for the
yanogen-ts generated OpenAPI TypeScript client.

## Overview

The benchmark suite evaluates the performance characteristics and memory usage
patterns of the generated TypeScript client under various load conditions. It
provides insights into:

- Memory usage and potential memory leaks
- Request latency and throughput
- Error rates and success patterns
- Performance under different concurrency levels

## Prerequisites

- Node.js 20.18.2+ (as specified in the project)
- The Express server example must be available at
  `../src/express-server-example.ts`
- Generated client code must be available at `../generated/client/`

## Scripts

### 1. Memory Benchmark (`memory-benchmark.ts`)

Focuses on memory usage analysis by executing batches of requests and monitoring
heap usage.

**Features:**

- Tests with 100, 500, and 1000 requests
- Monitors memory growth and detects potential leaks
- Provides memory snapshots throughout execution
- Alerts when memory growth exceeds configurable thresholds
- Supports garbage collection forcing (with `--expose-gc`)

**Usage:**

```bash
tsx memory-benchmark.ts
# or with garbage collection
node --expose-gc tsx memory-benchmark.ts
```

**Output:**

- Memory usage before/after each test batch
- Peak memory usage detection
- Memory growth analysis and leak warnings
- Summary table with memory statistics

### 2. Performance Benchmark (`performance-benchmark.ts`)

Focuses on latency, throughput, and response time analysis under various load
conditions.

**Features:**

- Tests different operation types (GET /inventory, GET /pets, etc.)
- Measures performance under different concurrency levels (1, 5, 10, 20)
- Runs multiple cycles for consistent results
- Provides detailed latency statistics (min, max, avg, p95, p99)
- Calculates requests per second (RPS)

**Usage:**

```bash
tsx performance-benchmark.ts
```

**Output:**

- Operation-specific performance metrics
- Throughput analysis under different concurrency levels
- Latency percentiles and success rates
- Performance insights and recommendations

### 3. Integrated Benchmark (`integrated-benchmark.ts`)

Combines memory and performance monitoring in a comprehensive load test with
realistic usage patterns.

**Features:**

- Three load phases: Light, Medium, Heavy
- Continuous memory monitoring during load tests
- Real-time performance tracking
- Health assessment and recommendations
- Comprehensive analysis of memory vs performance tradeoffs

**Usage:**

```bash
tsx integrated-benchmark.ts
# or with garbage collection
node --expose-gc tsx integrated-benchmark.ts
```

**Output:**

- Phase-by-phase results with memory and performance metrics
- Memory growth analysis across load phases
- Overall health assessment
- Actionable recommendations

## Installation

1. Navigate to the benchmark directory:

   ```bash
   cd examples/benchmark
   ```

2. Install dependencies (optional, for advanced profiling):
   ```bash
   npm install
   ```

## Running the Benchmarks

### Quick Start

Run all benchmarks:

```bash
npm run all
```

Run individual benchmarks:

```bash
npm run memory      # Memory benchmark only
npm run performance # Performance benchmark only
npm run integrated  # Integrated benchmark only
```

### Manual Execution

```bash
# Basic memory test
tsx memory-benchmark.ts

# Performance test
tsx performance-benchmark.ts

# Comprehensive integrated test
tsx integrated-benchmark.ts
```

### Advanced Options

For better memory analysis, use garbage collection:

```bash
node --expose-gc tsx memory-benchmark.ts
node --expose-gc tsx integrated-benchmark.ts
```

## Understanding the Results

### Memory Metrics

- **Initial Memory**: Heap usage before starting requests
- **Final Memory**: Heap usage after completing all requests
- **Peak Memory**: Maximum heap usage observed during testing
- **Memory Growth**: Difference between final and initial memory
- **Memory Leak Warning**: Triggered when growth exceeds 10-15 MB threshold

### Performance Metrics

- **RPS (Requests Per Second)**: Throughput measurement
- **Latency**: Time taken for individual requests
- **P95/P99**: 95th/99th percentile response times
- **Success Rate**: Percentage of successful requests
- **Concurrency**: Number of simultaneous requests

### Health Assessment

The integrated benchmark provides a health assessment:

- ✅ **Healthy**: All metrics within expected ranges
- ⚠️ **Warnings**: Minor issues that should be monitored
- ❌ **Issues**: Problems requiring investigation

## Configuration

Each benchmark can be customized by modifying the `CONFIG` object at the top of
each file:

```typescript
const CONFIG = {
  serverPort: 3000,
  serverHost: "localhost",
  memoryThresholdMB: 10,
  requestCounts: [100, 500, 1000],
  concurrencyLevels: [1, 5, 10, 20],
  // ... other settings
};
```

## Troubleshooting

### Common Issues

1. **Server not starting**: Ensure the Express server example is available and
   dependencies are installed
2. **Module not found**: Verify that the generated client exists at
   `../generated/client/`
3. **Permission errors**: Ensure Node.js has permission to spawn child processes
4. **Memory warnings**: Consider running with `--expose-gc` for more accurate
   memory analysis

### Server Dependencies

The benchmarks automatically start and stop the Express server. If you encounter
issues:

1. Check that the generated client is up to date:

   ```bash
   pnpm generate:examples
   ```

2. Verify the server example works independently:

   ```bash
   cd ../src
   tsx express-server-example.ts
   ```

## Best Practices

1. **Run multiple times**: Performance can vary between runs
2. **Use --expose-gc**: For accurate memory leak detection
3. **Monitor production**: Benchmark results may differ from production
   environments
4. **Regular testing**: Run benchmarks after client generation changes
5. **Resource monitoring**: Watch system resources during testing

## Integration with CI/CD

These benchmarks can be integrated into CI/CD pipelines to detect performance
regressions:

```bash
# Exit with error if memory growth exceeds threshold
tsx memory-benchmark.ts | grep "WARNING" && exit 1 || exit 0

# Check performance degradation
tsx performance-benchmark.ts | grep "RPS" | awk '{if($2 < 100) exit 1}'
```

## Advanced Profiling

For detailed profiling, consider using clinic.js (optional dependency):

```bash
# Install clinic (optional)
npm install clinic

# Run with clinic doctor
npx clinic doctor -- tsx integrated-benchmark.ts

# Run with heap profiler
npx clinic heapprofiler -- tsx memory-benchmark.ts
```

## Reporting Issues

When reporting performance issues, include:

1. Benchmark output (full logs)
2. System specifications (CPU, RAM, Node.js version)
3. Generated client size and complexity
4. OpenAPI specification details

---

For more information about the yanogen-ts project, see the main
[README.md](../../README.md).
