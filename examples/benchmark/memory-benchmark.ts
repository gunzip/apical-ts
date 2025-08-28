#!/usr/bin/env node

/* Memory benchmark script for yanogen-ts generated client */

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

/* Configuration */
const CONFIG = {
  serverPort: 3000,
  serverHost: "localhost",
  requestCounts: [100, 500, 1000], // Different load levels to test
  memoryThresholdMB: 10, // Alert if memory grows by more than this amount
  gcForceInterval: 50, // Force GC every N requests
  samplingInterval: 10, // Sample memory every N requests
};

const API_CONFIG = {
  ...globalConfig,
  baseURL: `http://${CONFIG.serverHost}:${CONFIG.serverPort}`,
};

/* Utility to format memory usage */
function formatMemory(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

/* Utility to get memory snapshot */
function getMemorySnapshot(label = "") {
  const usage = process.memoryUsage();
  return {
    label,
    timestamp: Date.now(),
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

/* Force garbage collection if available */
function forceGC() {
  if (global.gc) {
    global.gc();
    return true;
  }
  return false;
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

/* Execute memory test with specified request count */
async function executeMemoryTest(requestCount) {
  console.log(`\n📊 Starting memory test with ${requestCount} requests`);

  const api = configureOperations(
    {
      findPetsByStatus,
      getInventory,
      getPetById,
    },
    API_CONFIG,
  );

  const memorySnapshots = [];
  let initialSnapshot = getMemorySnapshot("initial");
  memorySnapshots.push(initialSnapshot);

  console.log(
    `📏 Initial memory usage: ${formatMemory(initialSnapshot.heapUsed)}`,
  );

  const operations = [
    () => api.findPetsByStatus({ query: { status: "available" } }),
    () => api.findPetsByStatus({ query: { status: "pending" } }),
    () => api.findPetsByStatus({ query: { status: "sold" } }),
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

  const startTime = performance.now();
  let successfulRequests = 0;
  let failedRequests = 0;

  for (let i = 0; i < requestCount; i++) {
    try {
      /* Rotate through different operations */
      const operation = operations[i % operations.length];
      const response = await operation();

      if (response.status >= 200 && response.status < 300) {
        successfulRequests++;
      } else {
        failedRequests++;
      }

      /* Sample memory periodically */
      if ((i + 1) % CONFIG.samplingInterval === 0) {
        const snapshot = getMemorySnapshot(`request-${i + 1}`);
        memorySnapshots.push(snapshot);
      }

      /* Force GC periodically if available */
      if ((i + 1) % CONFIG.gcForceInterval === 0) {
        const gcForced = forceGC();
        if (gcForced) {
          const postGcSnapshot = getMemorySnapshot(`post-gc-${i + 1}`);
          memorySnapshots.push(postGcSnapshot);
        }
      }
    } catch (error) {
      failedRequests++;
      console.error(`❌ Request ${i + 1} failed:`, error.message);
    }
  }

  const endTime = performance.now();
  const finalSnapshot = getMemorySnapshot("final");
  memorySnapshots.push(finalSnapshot);

  /* Analyze memory usage */
  const memoryGrowth = finalSnapshot.heapUsed - initialSnapshot.heapUsed;
  const memoryGrowthMB = memoryGrowth / 1024 / 1024;

  console.log(`\n📈 Memory Test Results (${requestCount} requests):`);
  console.log(`⏱️  Total time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`✅ Successful requests: ${successfulRequests}`);
  console.log(`❌ Failed requests: ${failedRequests}`);
  console.log(`📏 Initial heap: ${formatMemory(initialSnapshot.heapUsed)}`);
  console.log(`📏 Final heap: ${formatMemory(finalSnapshot.heapUsed)}`);
  console.log(
    `📊 Memory growth: ${formatMemory(memoryGrowth)} (${memoryGrowthMB > 0 ? "+" : ""}${memoryGrowthMB.toFixed(2)} MB)`,
  );

  /* Alert if memory growth exceeds threshold */
  if (memoryGrowthMB > CONFIG.memoryThresholdMB) {
    console.log(
      `⚠️  WARNING: Memory growth (${memoryGrowthMB.toFixed(2)} MB) exceeds threshold (${CONFIG.memoryThresholdMB} MB)`,
    );
  } else {
    console.log(`✅ Memory growth within acceptable limits`);
  }

  /* Find peak memory usage */
  const peakMemory = Math.max(...memorySnapshots.map((s) => s.heapUsed));
  console.log(`🔝 Peak heap usage: ${formatMemory(peakMemory)}`);

  return {
    requestCount,
    totalTime: endTime - startTime,
    successfulRequests,
    failedRequests,
    initialMemory: initialSnapshot.heapUsed,
    finalMemory: finalSnapshot.heapUsed,
    peakMemory,
    memoryGrowth,
    memoryGrowthMB,
    snapshots: memorySnapshots,
  };
}

/* Main execution */
async function runMemoryBenchmark() {
  console.log("🧪 Starting Memory Benchmark for yanogen-ts Generated Client");
  console.log(`📋 Configuration:`);
  console.log(`   Server: ${API_CONFIG.baseURL}`);
  console.log(`   Request counts: ${CONFIG.requestCounts.join(", ")}`);
  console.log(`   Memory threshold: ${CONFIG.memoryThresholdMB} MB`);
  console.log(
    `   GC available: ${global.gc ? "Yes" : "No (run with --expose-gc)"}`,
  );

  let serverProcess = null;

  try {
    /* Start server */
    serverProcess = await startServer();
    await waitForServer();

    const results = [];

    /* Run tests with different request counts */
    for (const requestCount of CONFIG.requestCounts) {
      const result = await executeMemoryTest(requestCount);
      results.push(result);

      /* Wait between tests to let memory settle */
      console.log("⏳ Waiting between tests...");
      await delay(2000);

      /* Force GC between tests if available */
      forceGC();
    }

    /* Summary */
    console.log(`\n📋 Summary of Memory Tests:`);
    console.log(
      `┌──────────────┬────────────┬─────────────┬─────────────┬────────────────┐`,
    );
    console.log(
      `│ Requests     │ Time (ms)  │ Success     │ Failed      │ Memory Growth  │`,
    );
    console.log(
      `├──────────────┼────────────┼─────────────┼─────────────┼────────────────┤`,
    );

    for (const result of results) {
      const timeStr = result.totalTime.toFixed(0).padStart(10);
      const successStr = result.successfulRequests.toString().padStart(11);
      const failedStr = result.failedRequests.toString().padStart(11);
      const memoryStr =
        `${result.memoryGrowthMB > 0 ? "+" : ""}${result.memoryGrowthMB.toFixed(2)} MB`.padStart(
          14,
        );

      console.log(
        `│ ${result.requestCount.toString().padStart(12)} │${timeStr} │${successStr} │${failedStr} │${memoryStr} │`,
      );
    }
    console.log(
      `└──────────────┴────────────┴─────────────┴─────────────┴────────────────┘`,
    );

    /* Check for potential memory leaks */
    const maxGrowth = Math.max(...results.map((r) => r.memoryGrowthMB));
    if (maxGrowth > CONFIG.memoryThresholdMB) {
      console.log(
        `\n⚠️  Potential memory leak detected: max growth ${maxGrowth.toFixed(2)} MB > ${CONFIG.memoryThresholdMB} MB`,
      );
      console.log(
        `   Consider investigating object retention or adding explicit cleanup`,
      );
    } else {
      console.log(`\n✅ No memory leaks detected - all tests within threshold`);
    }
  } catch (error) {
    console.error("❌ Memory benchmark failed:", error.message);
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
  console.log("\n👋 Memory benchmark interrupted");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Memory benchmark terminated");
  process.exit(0);
});

/* CLI argument handling */
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Memory Benchmark Script for yanogen-ts Generated Client

Usage: node memory-benchmark.js [options]

Options:
  --help, -h         Show this help message
  --expose-gc        Enable garbage collection (pass to node)
  
Example:
  node --expose-gc memory-benchmark.js

This script tests memory usage patterns by:
1. Starting the Express server
2. Making batches of API requests using the generated client
3. Monitoring heap usage and detecting potential memory leaks
4. Providing detailed memory usage reports
  `);
  process.exit(0);
}

/* Run the benchmark */
runMemoryBenchmark().catch(console.error);
