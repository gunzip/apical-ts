import { ChildProcess, spawn } from "child_process";
import { promisify } from "util";

const sleep = promisify(setTimeout);

/**
 * Mock server configuration
 */
export interface MockServerConfig {
  host?: string;
  port: number;
  specPath: string;
}

/**
 * Mock server instance manager
 */
export class MockServer {
  private config: MockServerConfig;
  private process: ChildProcess | null = null;

  constructor(config: MockServerConfig) {
    this.config = {
      host: "0.0.0.0",
      ...config,
    };
  }

  /**
   * Get the base URL for the mock server
   */
  getBaseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Start the Prism mock server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        "exec",
        "prism",
        "mock",
        this.config.specPath,
        "--port",
        this.config.port.toString(),
        "--host",
        this.config.host!,
      ];

      console.log(`Starting mock server: pnpm ${args.join(" ")}`);

      this.process = spawn("pnpm", args, {
        detached: false,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let started = false;
      let output = "";

      // Listen for stdout to detect when server is ready
      this.process.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        output += text;

        // Look for indication that Prism is ready
        if (
          text.includes("Prism is listening") ||
          text.includes(`http://${this.config.host}:${this.config.port}`)
        ) {
          if (!started) {
            started = true;
            console.log(
              `Mock server started on http://${this.config.host}:${this.config.port}`,
            );
            resolve();
          }
        }
      });

      // Listen for stderr
      this.process.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        output += text;
        console.error("Prism stderr:", text);
      });

      // Handle process exit
      this.process.on("exit", (code, signal) => {
        if (!started) {
          reject(
            new Error(
              `Prism process exited with code ${code}, signal ${signal}. Output: ${output}`,
            ),
          );
        }
      });

      // Handle process errors
      this.process.on("error", (error) => {
        if (!started) {
          reject(new Error(`Failed to start Prism: ${error.message}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!started) {
          this.stop();
          reject(
            new Error(`Timeout waiting for Prism to start. Output: ${output}`),
          );
        }
      }, 30000);
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");

      // Wait a bit for graceful shutdown
      await sleep(1000);

      // Force kill if still running
      if (!this.process.killed) {
        this.process.kill("SIGKILL");
      }

      this.process = null;
      console.log("Mock server stopped");
    }
  }
}

/**
 * Generate a random port number for testing
 */
export function getRandomPort(): number {
  return Math.floor(Math.random() * (65535 - 3000) + 3000);
}

/**
 * Wait for a port to be available by attempting HTTP requests
 */
export async function waitForPort(
  host: string,
  port: number,
  timeout = 10000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://${host}:${port}`, {
        method: "GET",
        signal: AbortSignal.timeout(1000),
      });

      // If we get any response (even an error), the port is open
      return true;
    } catch (error) {
      // Port not ready yet, wait a bit
      await sleep(100);
    }
  }

  return false;
}
