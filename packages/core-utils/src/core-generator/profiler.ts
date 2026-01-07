/* eslint-disable no-console */

export class Profiler {
  private marks = new Map<
    string,
    { durationMs?: number; end?: bigint; start: bigint }
  >();
  private sequence: string[] = [];
  end(name: string): void {
    const mark = this.marks.get(name);
    if (!mark) return;
    if (mark.end) return; // already ended
    mark.end = process.hrtime.bigint();
    const ns = Number(mark.end - mark.start);
    mark.durationMs = ns / 1_000_000; // convert ns to ms
    this.marks.set(name, mark);
  }

  get(name: string): number | undefined {
    return this.marks.get(name)?.durationMs;
  }

  printSummary(title = "Timing (ms)"): void {
    const rows = Array.from(this.marks.entries())
      .map(([k, v]) => ({
        end: v.end,
        ms: v.durationMs ?? 0,
        name: k,
        start: v.start,
      }))
      .filter((r) => Number.isFinite(r.ms));

    const starts = rows.map((r) => r.start);
    const ends = rows
      .map((r) => r.end)
      .filter((e): e is bigint => typeof e === "bigint");
    const totalStart = starts.length
      ? starts.reduce((acc, cur) => (cur < acc ? cur : acc))
      : undefined;
    const totalEnd = ends.length
      ? ends.reduce((acc, cur) => (cur > acc ? cur : acc))
      : undefined;
    const wallMs =
      totalStart != null && totalEnd != null
        ? Number(totalEnd - totalStart) / 1_000_000
        : undefined;

    // Sort by descending duration
    rows.sort((a, b) => b.ms - a.ms);

    console.log(`\n⏱  ${title}`);
    for (const r of rows) {
      console.log(`  - ${r.name}: ${r.ms.toFixed(2)} ms`);
    }
    if (wallMs != null) {
      console.log(`  - Total (wall): ${wallMs.toFixed(2)} ms`);
    }
    // Keep also chronological order view for convenience
    const chrono = this.sequence
      .map((name) => ({ ms: this.marks.get(name)?.durationMs, name }))
      .filter(
        (r): r is { ms: number; name: string } => typeof r.ms === "number",
      );
    if (chrono.length > 0) {
      const sum = chrono.reduce((acc, r) => acc + r.ms, 0);
      console.log(`  - Total (sum of phases): ${sum.toFixed(2)} ms`);
    }
    console.log("");
  }

  start(name: string): void {
    if (!this.marks.has(name)) {
      this.sequence.push(name);
    }
    this.marks.set(name, { start: process.hrtime.bigint() });
  }
}
