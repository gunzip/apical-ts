#!/usr/bin/env node

/* Integrated benchmark script combining memory and performance testing */

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

/* Configuration */
const CONFIG = {
  serverPort: 3000,
  serverHost: "localhost",

  /* Test phases */
  phases: [
    { name: "Light Load", concurrency: 1, requests: 100, duration: 30000 },
    { name: "Medium Load", concurrency: 5, requests: 1000, duration: 60000 },
    { name: "Heavy Load", concurrency: 10, requests: 8000, duration: 90000 },
  ],

  /* Memory monitoring */
  memoryThresholdMB: 15,
  memorySampleInterval: 5000, // Sample every 5 seconds

  /* Performance monitoring */
  performanceSampleInterval: 1000, // Sample every 1 second

  /* General */
  warmupRequests: 20,
  cooldownTime: 5000, // Time between phases
};

const API_CONFIG = {
  ...globalConfig,
  baseURL: `http://${CONFIG.serverHost}:${CONFIG.serverPort}`,
};

/* Utility classes */
class MemoryMonitor {
  private samples: any[];
  private monitoring: boolean;
  private interval: NodeJS.Timeout | null;

  constructor() {
    this.samples = [];
    this.monitoring = false;
    this.interval = null;
  }

  start() {
    if (this.monitoring) return;

    this.monitoring = true;
    this.samples = [];

    this.interval = setInterval(() => {
      if (this.monitoring) {
        this.sample();
      }
    }, CONFIG.memorySampleInterval);

    /* Take initial sample */
    this.sample();
  }

  stop() {
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    /* Take final sample */
    this.sample();
  }

  sample() {
    const usage = process.memoryUsage();
    const sample = {
      timestamp: Date.now(),
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
    };

    this.samples.push(sample);
    return sample;
  }

  getAnalysis() {
    if (this.samples.length === 0) {
      return null;
    }

    const initial = this.samples[0];
    const final = this.samples[this.samples.length - 1];
    const peak = this.samples.reduce(
      (max, sample) => (sample.heapUsed > max.heapUsed ? sample : max),
      initial,
    );

    const growth = final.heapUsed - initial.heapUsed;
    const growthMB = growth / 1024 / 1024;

    return {
      initial: initial.heapUsed,
      final: final.heapUsed,
      peak: peak.heapUsed,
      growth,
      growthMB,
      samples: this.samples.length,
      duration: final.timestamp - initial.timestamp,
      avgMemory:
        this.samples.reduce((sum, s) => sum + s.heapUsed, 0) /
        this.samples.length,
    };
  }

  formatBytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}

class PerformanceMonitor {
  private measurements: any[];
  private monitoring: boolean;
  private interval: NodeJS.Timeout | null;
  private requestCount: number;
  private successCount: number;
  private errorCount: number;
  private lastSampleTime: number;
  private lastRequestCount: number;

  constructor() {
    this.measurements = [];
    this.monitoring = false;
    this.interval = null;
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.lastSampleTime = 0;
    this.lastRequestCount = 0;
  }

  start() {
    if (this.monitoring) return;

    this.monitoring = true;
    this.measurements = [];
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.lastSampleTime = Date.now();
    this.lastRequestCount = 0;

    this.interval = setInterval(() => {
      if (this.monitoring) {
        this.sampleThroughput();
      }
    }, CONFIG.performanceSampleInterval);
  }

  stop() {
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  sampleThroughput() {
    const now = Date.now();
    const timeDelta = now - this.lastSampleTime;
    const requestDelta = this.requestCount - this.lastRequestCount;
    const rps = (requestDelta / timeDelta) * 1000;

    this.measurements.push({
      timestamp: now,
      requestsPerSecond: rps,
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      errors: this.errorCount,
    });

    this.lastSampleTime = now;
    this.lastRequestCount = this.requestCount;
  }

  recordRequest(success, duration) {
    this.requestCount++;
    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }
  }

  getAnalysis() {
    if (this.measurements.length === 0) {
      return null;
    }

    const throughputs = this.measurements
      .map((m) => m.requestsPerSecond)
      .filter((rps) => rps > 0);
    const avgThroughput =
      throughputs.length > 0
        ? throughputs.reduce((sum, rps) => sum + rps, 0) / throughputs.length
        : 0;
    const maxThroughput = Math.max(0, ...throughputs);

    return {
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      errorCount: this.errorCount,
      successRate:
        this.requestCount > 0
          ? (this.successCount / this.requestCount) * 100
          : 0,
      avgThroughput,
      maxThroughput,
      measurements: this.measurements.length,
    };
  }
}

/* Server management */
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
      if (!text.includes("Unsupported engine")) {
        console.error("Server stderr:", text);
      }
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

    /* Timeout if server doesn't start within 15 seconds */
    globalThis.setTimeout(() => {
      if (!serverReady) {
        serverProcess.kill();
        reject(new Error("Server startup timeout"));
      }
    }, 15000);
  });
}

async function waitForServer(maxRetries = 10) {
  const api = configureOperations({ getInventory }, API_CONFIG);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await api.getInventory({
        headers: { api_key: "test-key" },
      });

      if (response.success && response.status === 200) {
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

/* Test execution */
async function warmupPhase(api) {
  console.log(`🔥 Warming up with ${CONFIG.warmupRequests} requests...`);

  for (let i = 0; i < CONFIG.warmupRequests; i++) {
    try {
      await api.getInventory({ headers: { api_key: "warmup-key" } });
    } catch (error) {
      /* Ignore warmup errors */
    }
  }

  console.log("✅ Warmup completed");
}

async function executePhase(api, phase, memoryMonitor, performanceMonitor) {
  console.log(`\n🎯 Starting ${phase.name} phase...`);
  console.log(
    `   Concurrency: ${phase.concurrency}, Target requests: ${phase.requests}, Max duration: ${phase.duration}ms`,
  );

  /* Start monitoring */
  memoryMonitor.start();
  performanceMonitor.start();

  const operations = [
    () => api.findPetsByStatus({ query: { status: "available" } }),
    () => api.findPetsByStatus({ query: { status: "pending" } }),
    () =>
      api.getPetById({
        headers: { api_key: "test-key" },
        path: { petId: "1" },
      }),
    () =>
      api.getPetById({
        headers: { api_key: "test-key" },
        path: { petId: "2" },
      }),
    () => api.getInventory({ headers: { api_key: "test-key" } }),
  ];

  const startTime = Date.now();
  let requestsCompleted = 0;
  let running = true;

  /* Stop after max duration */
  const timeout = globalThis.setTimeout(() => {
    running = false;
    console.log(`   ⏱️  Phase timeout reached (${phase.duration}ms)`);
  }, phase.duration);

  /* Execute concurrent requests */
  const promises = [];

  for (let c = 0; c < phase.concurrency; c++) {
    const workerPromise = (async () => {
      while (running && requestsCompleted < phase.requests) {
        try {
          const operation = operations[requestsCompleted % operations.length];
          const requestStart = performance.now();

          const response = await operation();
          const duration = performance.now() - requestStart;

          const success =
            response.success && response.status >= 200 && response.status < 300;
          performanceMonitor.recordRequest(success, duration);

          requestsCompleted++;

          /* Small delay to prevent overwhelming the server */
          if (running && requestsCompleted < phase.requests) {
            await delay(50);
          }
        } catch (error) {
          performanceMonitor.recordRequest(false, 0);
          requestsCompleted++;
        }
      }
    })();

    promises.push(workerPromise);
  }

  /* Wait for all workers to complete or timeout */
  await Promise.all(promises);
  running = false;
  clearTimeout(timeout);

  /* Stop monitoring */
  memoryMonitor.stop();
  performanceMonitor.stop();

  const endTime = Date.now();
  const actualDuration = endTime - startTime;

  console.log(
    `   ✅ ${phase.name} phase completed: ${requestsCompleted} requests in ${actualDuration}ms`,
  );

  return {
    phase: phase.name,
    requestsCompleted,
    actualDuration,
    memory: memoryMonitor.getAnalysis(),
    performance: performanceMonitor.getAnalysis(),
  };
}

/* Results analysis and display */
function displayResults(results) {
  console.log(`\n📊 Integrated Benchmark Results`);
  console.log(
    `════════════════════════════════════════════════════════════════════════`,
  );

  /* Summary table */
  console.log(`\n📈 Phase Summary:`);
  console.log(
    `┌──────────────┬───────────┬──────────┬───────────┬────────────┬─────────────┐`,
  );
  console.log(
    `│ Phase        │ Requests  │ Duration │ RPS       │ Success    │ Memory Δ   │`,
  );
  console.log(
    `├──────────────┼───────────┼──────────┼───────────┼────────────┼─────────────┤`,
  );

  for (const result of results) {
    const phaseStr = result.phase.padEnd(12);
    const requestsStr = result.requestsCompleted.toString().padStart(9);
    const durationStr =
      `${(result.actualDuration / 1000).toFixed(1)}s`.padStart(8);
    const rpsStr = result.performance
      ? result.performance.avgThroughput.toFixed(1).padStart(9)
      : "N/A".padStart(9);
    const successStr = result.performance
      ? `${result.performance.successRate.toFixed(1)}%`.padStart(10)
      : "N/A".padStart(10);
    const memoryStr = result.memory
      ? `${result.memory.growthMB > 0 ? "+" : ""}${result.memory.growthMB.toFixed(1)} MB`.padStart(
          11,
        )
      : "N/A".padStart(11);

    console.log(
      `│ ${phaseStr} │${requestsStr} │${durationStr} │${rpsStr} │${successStr} │${memoryStr} │`,
    );
  }
  console.log(
    `└──────────────┴───────────┴──────────┴───────────┴────────────┴─────────────┘`,
  );

  /* Memory analysis */
  console.log(`\n🧠 Memory Analysis:`);
  let totalMemoryGrowth = 0;
  let maxPeakMemory = 0;

  for (const result of results) {
    if (result.memory) {
      console.log(`   ${result.phase}:`);
      console.log(
        `     Initial: ${(result.memory.initial / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(
        `     Peak: ${(result.memory.peak / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(
        `     Final: ${(result.memory.final / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(
        `     Growth: ${result.memory.growthMB > 0 ? "+" : ""}${result.memory.growthMB.toFixed(2)} MB`,
      );
      console.log(
        `     Average: ${(result.memory.avgMemory / 1024 / 1024).toFixed(2)} MB`,
      );

      totalMemoryGrowth += result.memory.growthMB;
      maxPeakMemory = Math.max(maxPeakMemory, result.memory.peak);
    }
  }

  console.log(`\n   📊 Overall Memory Impact:`);
  console.log(
    `     Total growth across all phases: ${totalMemoryGrowth > 0 ? "+" : ""}${totalMemoryGrowth.toFixed(2)} MB`,
  );
  console.log(
    `     Peak memory usage: ${(maxPeakMemory / 1024 / 1024).toFixed(2)} MB`,
  );

  if (totalMemoryGrowth > CONFIG.memoryThresholdMB) {
    console.log(
      `     ⚠️  WARNING: Total memory growth exceeds threshold (${CONFIG.memoryThresholdMB} MB)`,
    );
  } else {
    console.log(`     ✅ Memory usage within acceptable limits`);
  }

  /* Performance analysis */
  console.log(`\n⚡ Performance Analysis:`);
  let totalRequests = 0;
  let totalSuccessful = 0;
  let maxThroughput = 0;

  for (const result of results) {
    if (result.performance) {
      console.log(`   ${result.phase}:`);
      console.log(
        `     Requests: ${result.performance.totalRequests} (${result.performance.successfulRequests} successful)`,
      );
      console.log(
        `     Success rate: ${result.performance.successRate.toFixed(1)}%`,
      );
      console.log(
        `     Average RPS: ${result.performance.avgThroughput.toFixed(1)}`,
      );
      console.log(
        `     Peak RPS: ${result.performance.maxThroughput.toFixed(1)}`,
      );

      totalRequests += result.performance.totalRequests;
      totalSuccessful += result.performance.successfulRequests;
      maxThroughput = Math.max(maxThroughput, result.performance.maxThroughput);
    }
  }

  const overallSuccessRate =
    totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0;

  console.log(`\n   📊 Overall Performance:`);
  console.log(
    `     Total requests: ${totalRequests} (${totalSuccessful} successful)`,
  );
  console.log(`     Overall success rate: ${overallSuccessRate.toFixed(1)}%`);
  console.log(`     Peak throughput: ${maxThroughput.toFixed(1)} RPS`);

  /* Health assessment */
  console.log(`\n🏥 Health Assessment:`);

  const issues: string[] = [];
  const warnings: string[] = [];

  if (overallSuccessRate < 95) {
    issues.push(`Low success rate: ${overallSuccessRate.toFixed(1)}%`);
  }

  if (totalMemoryGrowth > CONFIG.memoryThresholdMB) {
    issues.push(`High memory growth: ${totalMemoryGrowth.toFixed(2)} MB`);
  }

  if (maxThroughput < 10) {
    warnings.push(`Low peak throughput: ${maxThroughput.toFixed(1)} RPS`);
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log(`   ✅ All metrics within healthy ranges`);
    console.log(`   💚 Client performance is good`);
  } else {
    if (issues.length > 0) {
      console.log(`   ❌ Issues detected:`);
      for (const issue of issues) {
        console.log(`      • ${issue}`);
      }
    }

    if (warnings.length > 0) {
      console.log(`   ⚠️  Warnings:`);
      for (const warning of warnings) {
        console.log(`      • ${warning}`);
      }
    }
  }

  /* Recommendations */
  console.log(`\n💡 Recommendations:`);
  if (totalMemoryGrowth > CONFIG.memoryThresholdMB) {
    console.log(
      `   • Consider investigating memory leaks or implementing connection pooling`,
    );
  }
  if (maxThroughput < 50) {
    console.log(
      `   • Consider optimizing request handling or increasing concurrency limits`,
    );
  }
  if (overallSuccessRate < 99) {
    console.log(`   • Investigate error handling and retry mechanisms`);
  }
  if (issues.length === 0 && warnings.length === 0) {
    console.log(
      `   • Performance is good - consider stress testing with higher loads`,
    );
    console.log(`   • Monitor memory usage in production environments`);
  }
}

/* Force garbage collection if available */
function forceGC() {
  if (global.gc) {
    global.gc();
    return true;
  }
  return false;
}

/* Main execution */
async function runIntegratedBenchmark() {
  console.log("🚀 Starting Integrated Memory + Performance Benchmark");
  console.log(`📋 Configuration:`);
  console.log(`   Server: ${API_CONFIG.baseURL}`);
  console.log(`   Phases: ${CONFIG.phases.length}`);
  console.log(`   Memory threshold: ${CONFIG.memoryThresholdMB} MB`);
  console.log(
    `   GC available: ${global.gc ? "Yes" : "No (run with --expose-gc for better memory analysis)"}`,
  );

  let serverProcess: any = null;

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
      },
      API_CONFIG,
    );

    /* Initial warmup */
    await warmupPhase(api);

    /* Force initial GC if available */
    forceGC();
    await delay(1000);

    const results: any[] = [];

    /* Execute all phases */
    for (let i = 0; i < CONFIG.phases.length; i++) {
      const phase = CONFIG.phases[i];
      const memoryMonitor = new MemoryMonitor();
      const performanceMonitor = new PerformanceMonitor();

      const result = await executePhase(
        api,
        phase,
        memoryMonitor,
        performanceMonitor,
      );
      results.push(result);

      /* Cooldown between phases */
      if (i < CONFIG.phases.length - 1) {
        console.log(`⏳ Cooldown period (${CONFIG.cooldownTime}ms)...`);
        forceGC(); // Try to clean up between phases
        await delay(CONFIG.cooldownTime);
      }
    }

    /* Display comprehensive results */
    displayResults(results);
  } catch (error) {
    console.error("❌ Integrated benchmark failed:", error.message);
    process.exit(1);
  } finally {
    /* Cleanup */
    if (serverProcess) {
      console.log("\n🧹 Stopping server...");
      serverProcess.kill();
      await delay(2000);
    }
  }
}

/* Handle graceful shutdown */
process.on("SIGINT", () => {
  console.log("\n👋 Integrated benchmark interrupted");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Integrated benchmark terminated");
  process.exit(0);
});

/* CLI argument handling */
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Integrated Memory + Performance Benchmark for yanogen-ts Generated Client

Usage: node integrated-benchmark.js [options]

Options:
  --help, -h         Show this help message
  --expose-gc        Enable garbage collection (pass to node)

Example:
  node --expose-gc integrated-benchmark.js

This script provides comprehensive testing by:
1. Starting the Express server
2. Running multiple test phases with different load levels
3. Monitoring memory usage continuously throughout the test
4. Measuring performance metrics (RPS, latency, success rates)
5. Providing health assessment and recommendations

Test phases:
  - Light Load: Low concurrency, baseline measurements
  - Medium Load: Moderate concurrency, typical usage patterns
  - Heavy Load: High concurrency, stress testing

The integrated approach helps identify how memory and performance
characteristics change under different load conditions.
  `);
  process.exit(0);
}

/* Run the benchmark */
runIntegratedBenchmark().catch(console.error);
