#!/usr/bin/env node

/* Performance benchmark script for yanogen-ts generated client */

import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

/* Import generated client operations */
import {
  configureOperations,
  globalConfig,
} from "../generated/client/config.js";
import { findPetsByStatus } from "../generated/client/findPetsByStatus.js";
import { getInventory } from "../generated/client/getInventory.js";
import { getPetById } from "../generated/client/getPetById.js";
import { addPet } from "../generated/client/addPet.js";
import { updatePet } from "../generated/client/updatePet.js";

/* Configuration */
const CONFIG = {
  serverPort: 3000,
  serverHost: "localhost",
  warmupRequests: 10, // Requests to warm up the connection
  concurrencyLevels: [1, 5, 10, 20], // Different levels of concurrent requests
  requestsPerLevel: 50, // Number of requests per concurrency level
  operationCycles: 3, // How many times to repeat the full test suite
  timeoutMs: 30000, // Request timeout
};

const API_CONFIG = {
  ...globalConfig,
  baseURL: `http://${CONFIG.serverHost}:${CONFIG.serverPort}`,
};

/* Performance measurement utilities */
class PerformanceTracker {
  constructor(name) {
    this.name = name;
    this.measurements = [];
    this.errors = [];
  }

  async measure(operation) {
    const startTime = performance.now();
    const startMark = `${this.name}-${this.measurements.length}-start`;
    const endMark = `${this.name}-${this.measurements.length}-end`;

    try {
      performance.mark(startMark);
      const result = await operation();
      performance.mark(endMark);
      const endTime = performance.now();

      const duration = endTime - startTime;
      this.measurements.push({
        duration,
        startTime,
        endTime,
        success: true,
        status: result?.status,
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.measurements.push({
        duration,
        startTime,
        endTime,
        success: false,
        error: error.message,
      });

      this.errors.push(error);
      throw error;
    }
  }

  getStatistics() {
    const successes = this.measurements.filter((m) => m.success);
    const failures = this.measurements.filter((m) => !m.success);

    if (successes.length === 0) {
      return {
        count: this.measurements.length,
        successCount: 0,
        failureCount: failures.length,
        successRate: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = successes.map((m) => m.duration).sort((a, b) => a - b);
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: this.measurements.length,
      successCount: successes.length,
      failureCount: failures.length,
      successRate: (successes.length / this.measurements.length) * 100,
      avg: total / successes.length,
      min: durations[0] || 0,
      max: durations[durations.length - 1] || 0,
      p50: durations[Math.floor(durations.length * 0.5)] || 0,
      p95: durations[Math.floor(durations.length * 0.95)] || 0,
      p99: durations[Math.floor(durations.length * 0.99)] || 0,
    };
  }

  reset() {
    this.measurements = [];
    this.errors = [];
  }
}

/* Start Express server in background */
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log("🚀 Starting Express server...");

    const serverProcess = spawn("tsx", ["../src/express-server-example.ts"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
    });

    let serverReady = false;
    let output = "";

    serverProcess.stdout?.on("data", (data) => {
      const text = data.toString();
      output += text;

      if (text.includes("Express server running") && !serverReady) {
        serverReady = true;
        console.log("✅ Express server started successfully");
        resolve(serverProcess);
      }
    });

    serverProcess.stderr?.on("data", (data) => {
      const text = data.toString();
      output += text;
      console.error("Server stderr:", text);
    });

    serverProcess.on("exit", (code, signal) => {
      if (!serverReady) {
        reject(
          new Error(
            `Server exited early with code ${code}, signal ${signal}. Output: ${output}`,
          ),
        );
      }
    });

    serverProcess.on("error", (error) => {
      reject(error);
    });

    /* Timeout if server doesn't start within 10 seconds */
    globalThis.setTimeout(() => {
      if (!serverReady) {
        serverProcess.kill();
        reject(new Error("Server startup timeout"));
      }
    }, 10000);
  });
}

/* Wait for server to be ready */
async function waitForServer(maxRetries = 10) {
  const api = configureOperations({ getInventory }, API_CONFIG);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await api.getInventory({
        headers: { api_key: "test-key" },
      });

      if (response.status === 200) {
        console.log("✅ Server is ready and responding");
        return true;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(
          `Server not responding after ${maxRetries} attempts: ${error.message}`,
        );
      }
      console.log(`⏳ Waiting for server... (attempt ${i + 1}/${maxRetries})`);
      await delay(2000);
    }
  }
  return false;
}

/* Warmup requests to establish connections */
async function warmupRequests(api, count = CONFIG.warmupRequests) {
  console.log(`🔥 Warming up with ${count} requests...`);

  for (let i = 0; i < count; i++) {
    try {
      await api.getInventory({ headers: { api_key: "warmup-key" } });
    } catch (error) {
      /* Ignore warmup errors */
    }
  }

  console.log("✅ Warmup completed");
}

/* Test different operation types */
async function testOperationTypes(api) {
  console.log("\n📊 Testing different operation types...");

  const operations = {
    "GET /store/inventory (validated)": async () => {
      const res = await api.getInventory({ headers: { api_key: "test-key" } });
      return res;
    },
    "GET /store/inventory (raw)": async () => {
      const res = await fetch(`${API_CONFIG.baseURL}/store/raw/inventory`);
      return { status: res.status, data: await res.json() };
    },
    "GET /pet/findByStatus (validated)": async () => {
      const res = await api.findPetsByStatus({
        query: { status: "available" },
      });
      return res;
    },
    "GET /pet/findByStatus (raw)": async () => {
      const res = await fetch(
        `${API_CONFIG.baseURL}/pet/raw/findByStatus?status=available`,
      );
      return { status: res.status, data: await res.json() };
    },
    "GET /pet/{petId} (validated)": async () => {
      const res = await api.getPetById({
        headers: { api_key: "test-key" },
        path: { petId: "1" },
      });
      return res;
    },
    "GET /pet/{petId} (raw)": async () => {
      const res = await fetch(`${API_CONFIG.baseURL}/pet/raw/1`);
      return { status: res.status, data: await res.json() };
    },
    "GET /pet/{petId} (validated+parse)": async () => {
      const res = await api.getPetById({
        headers: { api_key: "test-key" },
        path: { petId: "1" },
      });
      // Misura parse()
      const t0 = performance.now();
      const parseResult = res.parse();
      const t1 = performance.now();
      return { ...res, parseTime: t1 - t0, parseResult };
    },
    "GET /pet/{petId} (raw+parse)": async () => {
      const res = await fetch(`${API_CONFIG.baseURL}/pet/raw/1`);
      const data = await res.json();
      // Simula validazione (parse) usando lo schema generato se disponibile
      // Qui si può importare lo schema e chiamare schema.parse(data)
      // Per ora solo misura parsing JSON
      const t0 = performance.now();
      JSON.parse(JSON.stringify(data));
      const t1 = performance.now();
      return { status: res.status, data, parseTime: t1 - t0 };
    },
  };

  const results = {};

  for (const [operationName, operation] of Object.entries(operations)) {
    console.log(`   Testing ${operationName}...`);
    const tracker = new PerformanceTracker(operationName);

    /* Test sequential requests */
    let parseTimes = [];
    for (let i = 0; i < 20; i++) {
      try {
        const result = await tracker.measure(operation);
        if (result && typeof result.parseTime === "number") {
          parseTimes.push(result.parseTime);
        }
      } catch (error) {
        /* Error already tracked in tracker */
      }
    }

    const stats = tracker.getStatistics();
    if (parseTimes.length) {
      stats.parseAvg =
        parseTimes.reduce((a, b) => a + b, 0) / parseTimes.length;
      stats.parseMin = Math.min(...parseTimes);
      stats.parseMax = Math.max(...parseTimes);
    }
    results[operationName] = stats;
  }

  return results;
}

/* Test concurrent requests */
async function testConcurrentRequests(api, concurrency, requestCount) {
  console.log(
    `\n⚡ Testing ${concurrency} concurrent requests (${requestCount} total)...`,
  );

  const tracker = new PerformanceTracker(`concurrent-${concurrency}`);
  const operation = () =>
    api.getInventory({ headers: { api_key: "test-key" } });

  const requestsPerBatch = Math.ceil(requestCount / concurrency);
  const promises = [];

  const startTime = performance.now();

  for (let batch = 0; batch < requestsPerBatch; batch++) {
    const batchPromises = [];

    for (
      let concurrent = 0;
      concurrent < concurrency &&
      batch * concurrency + concurrent < requestCount;
      concurrent++
    ) {
      batchPromises.push(tracker.measure(operation));
    }

    promises.push(...batchPromises);
  }

  const results = await Promise.allSettled(promises);
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const stats = tracker.getStatistics();
  const rps = (stats.successCount / totalTime) * 1000;

  return {
    concurrency,
    totalTime,
    requestsPerSecond: rps,
    ...stats,
  };
}

/* Test throughput under load */
async function testThroughput(api) {
  console.log("\n🚀 Testing throughput under different load levels...");

  const results = [];

  for (const concurrency of CONFIG.concurrencyLevels) {
    const result = await testConcurrentRequests(
      api,
      concurrency,
      CONFIG.requestsPerLevel,
    );
    results.push(result);

    /* Wait between tests */
    await delay(1000);
  }

  return results;
}

/* Format statistics for display */
function formatStats(stats) {
  return {
    count: stats.count,
    success: `${stats.successCount}/${stats.count} (${stats.successRate.toFixed(1)}%)`,
    avg: `${stats.avg.toFixed(2)}ms`,
    min: `${stats.min.toFixed(2)}ms`,
    max: `${stats.max.toFixed(2)}ms`,
    p50: `${stats.p50.toFixed(2)}ms`,
    p95: `${stats.p95.toFixed(2)}ms`,
    p99: `${stats.p99.toFixed(2)}ms`,
  };
}

/* Main execution */
async function runPerformanceBenchmark() {
  console.log(
    "⚡ Starting Performance Benchmark for yanogen-ts Generated Client",
  );
  console.log(`📋 Configuration:`);
  console.log(`   Server: ${API_CONFIG.baseURL}`);
  console.log(`   Warmup requests: ${CONFIG.warmupRequests}`);
  console.log(`   Concurrency levels: ${CONFIG.concurrencyLevels.join(", ")}`);
  console.log(`   Requests per level: ${CONFIG.requestsPerLevel}`);
  console.log(`   Operation cycles: ${CONFIG.operationCycles}`);

  let serverProcess = null;

  try {
    /* Start server */
    serverProcess = await startServer();
    await waitForServer();

    const api = configureOperations(
      {
        findPetsByStatus,
        getInventory,
        getPetById,
        addPet,
        updatePet,
      },
      API_CONFIG,
    );

    /* Warmup */
    await warmupRequests(api);

    const allResults = {
      operationTypes: [],
      throughput: [],
    };

    /* Run multiple cycles */
    for (let cycle = 1; cycle <= CONFIG.operationCycles; cycle++) {
      console.log(`\n🔄 Cycle ${cycle}/${CONFIG.operationCycles}`);

      /* Test operation types */
      const operationResults = await testOperationTypes(api);
      allResults.operationTypes.push(operationResults);

      /* Test throughput */
      const throughputResults = await testThroughput(api);
      allResults.throughput.push(throughputResults);

      if (cycle < CONFIG.operationCycles) {
        console.log("⏳ Waiting between cycles...");
        await delay(2000);
      }
    }

    /* Aggregate and display results */
    console.log(`\n📊 Performance Test Results Summary`);
    console.log(
      `════════════════════════════════════════════════════════════════════════`,
    );

    /* Operation type results */
    console.log(
      `\n📈 Operation Performance (averaged across ${CONFIG.operationCycles} cycles):`,
    );
    console.log(
      `┌──────────────────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐`,
    );
    console.log(
      `│ Operation                    │ Avg     │ Min     │ Max     │ P95     │ Success │`,
    );
    console.log(
      `├──────────────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤`,
    );

    /* Average operation results across cycles */
    const avgOperationResults = {};
    const operationNames = Object.keys(allResults.operationTypes[0] || {});

    for (const opName of operationNames) {
      const allStats = allResults.operationTypes.map((cycle) => cycle[opName]);
      const avgStats = {
        avg: allStats.reduce((sum, s) => sum + s.avg, 0) / allStats.length,
        min: Math.min(...allStats.map((s) => s.min)),
        max: Math.max(...allStats.map((s) => s.max)),
        p95: allStats.reduce((sum, s) => sum + s.p95, 0) / allStats.length,
        successRate:
          allStats.reduce((sum, s) => sum + s.successRate, 0) / allStats.length,
      };
      avgOperationResults[opName] = avgStats;

      const nameStr = opName.padEnd(28);
      const avgStr = `${avgStats.avg.toFixed(1)}ms`.padStart(7);
      const minStr = `${avgStats.min.toFixed(1)}ms`.padStart(7);
      const maxStr = `${avgStats.max.toFixed(1)}ms`.padStart(7);
      const p95Str = `${avgStats.p95.toFixed(1)}ms`.padStart(7);
      const successStr = `${avgStats.successRate.toFixed(1)}%`.padStart(7);

      console.log(
        `│ ${nameStr} │${avgStr} │${minStr} │${maxStr} │${p95Str} │${successStr} │`,
      );
    }
    console.log(
      `└──────────────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘`,
    );

    /* Throughput results */
    console.log(
      `\n🚀 Throughput Performance (averaged across ${CONFIG.operationCycles} cycles):`,
    );
    console.log(
      `┌─────────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────────┐`,
    );
    console.log(
      `│ Concurrency │ RPS     │ Avg     │ Min     │ Max     │ P95     │ Success  │`,
    );
    console.log(
      `├─────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┤`,
    );

    /* Average throughput results across cycles */
    for (let i = 0; i < CONFIG.concurrencyLevels.length; i++) {
      const concurrency = CONFIG.concurrencyLevels[i];
      const allStats = allResults.throughput.map((cycle) => cycle[i]);

      const avgStats = {
        requestsPerSecond:
          allStats.reduce((sum, s) => sum + s.requestsPerSecond, 0) /
          allStats.length,
        avg: allStats.reduce((sum, s) => sum + s.avg, 0) / allStats.length,
        min: Math.min(...allStats.map((s) => s.min)),
        max: Math.max(...allStats.map((s) => s.max)),
        p95: allStats.reduce((sum, s) => sum + s.p95, 0) / allStats.length,
        successRate:
          allStats.reduce((sum, s) => sum + s.successRate, 0) / allStats.length,
      };

      const concStr = concurrency.toString().padStart(11);
      const rpsStr = avgStats.requestsPerSecond.toFixed(1).padStart(7);
      const avgStr = `${avgStats.avg.toFixed(1)}ms`.padStart(7);
      const minStr = `${avgStats.min.toFixed(1)}ms`.padStart(7);
      const maxStr = `${avgStats.max.toFixed(1)}ms`.padStart(7);
      const p95Str = `${avgStats.p95.toFixed(1)}ms`.padStart(7);
      const successStr = `${avgStats.successRate.toFixed(1)}%`.padStart(8);

      console.log(
        `│${concStr} │${rpsStr} │${avgStr} │${minStr} │${maxStr} │${p95Str} │${successStr} │`,
      );
    }
    console.log(
      `└─────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────────┘`,
    );

    /* Performance insights */
    console.log(`\n💡 Performance Insights:`);

    const maxRps = Math.max(
      ...allResults.throughput.flat().map((r) => r.requestsPerSecond),
    );
    const optimalConcurrency = allResults.throughput[0].find(
      (r) => r.requestsPerSecond === maxRps,
    )?.concurrency;

    console.log(
      `   🏆 Peak throughput: ${maxRps.toFixed(1)} RPS at concurrency ${optimalConcurrency}`,
    );

    const fastestOp = Object.entries(avgOperationResults).reduce(
      (min, [name, stats]) =>
        stats.avg < min.avg ? { name, avg: stats.avg } : min,
      { name: "", avg: Infinity },
    );

    const slowestOp = Object.entries(avgOperationResults).reduce(
      (max, [name, stats]) =>
        stats.avg > max.avg ? { name, avg: stats.avg } : max,
      { name: "", avg: 0 },
    );

    console.log(
      `   ⚡ Fastest operation: ${fastestOp.name} (${fastestOp.avg.toFixed(1)}ms avg)`,
    );
    console.log(
      `   🐌 Slowest operation: ${slowestOp.name} (${slowestOp.avg.toFixed(1)}ms avg)`,
    );
  } catch (error) {
    console.error("❌ Performance benchmark failed:", error.message);
    process.exit(1);
  } finally {
    /* Cleanup */
    if (serverProcess) {
      console.log("\n🧹 Stopping server...");
      serverProcess.kill();
      await delay(1000);
    }
  }
}

/* Handle graceful shutdown */
process.on("SIGINT", () => {
  console.log("\n👋 Performance benchmark interrupted");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Performance benchmark terminated");
  process.exit(0);
});

/* CLI argument handling */
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Performance Benchmark Script for yanogen-ts Generated Client

Usage: node performance-benchmark.js [options]

Options:
  --help, -h         Show this help message

This script tests performance characteristics by:
1. Starting the Express server
2. Testing different operation types (GET, POST, etc.)
3. Testing throughput under various concurrency levels
4. Measuring latency, response times, and error rates
5. Providing detailed performance analysis and insights

The benchmark runs multiple cycles to ensure consistent results.
  `);
  process.exit(0);
}

/* Run the benchmark */
runPerformanceBenchmark().catch(console.error);
