import { ChildProcess, spawn } from "child_process";
import { promisify } from "util";

const sleep = promisify(setTimeout);

/**
 * Mock server configuration
 */
interface MockServerConfig {
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
   * Start the Prism mock server.
   * Retries with a fresh random port when the chosen port is already in use.
   */
  async start(): Promise<void> {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.startOnce();
        return;
      } catch (error) {
        const isPortInUse =
          error instanceof Error && error.message.includes("EADDRINUSE");

        if (!isPortInUse || attempt === maxAttempts) {
          throw error;
        }

        this.config.port = getRandomPort();
        console.log(
          `Mock server port already in use; retrying on port ${this.config.port} (attempt ${attempt + 1}/${maxAttempts})`,
        );
      }
    }
  }

  /**
   * Spawn the Prism mock server and resolve once it reports it is listening.
   */
  private startOnce(): Promise<void> {
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
        // Own process group so the whole tree (pnpm -> pnpm-native -> prism)
        // can be signalled at once; without this the real Prism process is
        // orphaned and keeps the test runner alive.
        detached: true,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let started = false;
      let output = "";
      let timeout: NodeJS.Timeout | undefined;

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
            clearTimeout(timeout);
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
          clearTimeout(timeout);
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
          clearTimeout(timeout);
          reject(new Error(`Failed to start Prism: ${error.message}`));
        }
      });

      // Timeout after 30 seconds. `unref` keeps this timer from holding the
      // event loop open once the server is up.
      timeout = setTimeout(() => {
        if (!started) {
          this.stop();
          reject(
            new Error(`Timeout waiting for Prism to start. Output: ${output}`),
          );
        }
      }, 30000);
      timeout.unref();
    });
  }

  /**
   * Stop the mock server, killing the whole process group and releasing the
   * stdio pipes so nothing keeps the event loop alive.
   */
  async stop(): Promise<void> {
    const child = this.process;
    if (!child) {
      return;
    }
    this.process = null;

    const pid = child.pid;
    const exited = new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }
      child.once("exit", () => resolve());
    });

    const signalGroup = (signal: NodeJS.Signals): void => {
      try {
        if (pid === undefined) {
          throw new Error("no pid");
        }
        process.kill(-pid, signal);
      } catch {
        child.kill(signal);
      }
    };

    signalGroup("SIGTERM");

    const graceful = await Promise.race([
      exited.then(() => true),
      sleep(3000).then(() => false),
    ]);

    if (!graceful) {
      signalGroup("SIGKILL");
      await Promise.race([exited, sleep(2000)]);
    }

    // The group leader can exit while a grandchild survives, so always sweep.
    signalGroup("SIGKILL");

    child.stdout?.destroy();
    child.stderr?.destroy();
    child.stdin?.destroy();

    console.log("Mock server stopped");
  }
}

/**
 * Generate a random port number for testing
 */
export function getRandomPort(): number {
  return Math.floor(Math.random() * (65535 - 3000) + 3000);
}
