import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { executeProductionFabric, planProductionFabric } from "../src/index.js";

describe("workflow package", () => {
  it("has a valid Exotic package manifest", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.name).toBe("@exotic/workflow");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("plans dependency layers, lane swarms, replicas, and approval barriers", () => {
    const plan = planProductionFabric({
      id: "venture-launch",
      title: "Venture launch line",
      maxConcurrency: 4,
      jobs: [
        { id: "ideas", title: "Frame ideas", lane: "ideas", replicas: 2 },
        { id: "research", title: "Research", lane: "research" },
        {
          id: "product",
          title: "Define product",
          lane: "product",
          dependsOn: ["ideas", "research"],
        },
        {
          id: "launch",
          title: "Launch",
          lane: "operations",
          dependsOn: ["product"],
          approvalRequired: true,
        },
        {
          id: "report",
          title: "Report",
          lane: "operations",
          dependsOn: ["launch"],
        },
      ],
    });

    expect(plan.layers.map((layer) => layer.jobIds)).toEqual([
      ["ideas", "research"],
      ["product"],
    ]);
    expect(plan.layers[0].swarms).toHaveLength(2);
    expect(plan.layers[0].cellCount).toBe(3);
    expect(plan.blocked).toEqual([
      { jobId: "launch", reason: "approval-required", waitingOn: ["launch"] },
      { jobId: "report", reason: "blocked-dependency", waitingOn: ["launch"] },
    ]);
    expect(plan.metrics).toMatchObject({
      totalJobs: 5,
      scheduledJobs: 3,
      blockedJobs: 2,
      dependencyLayers: 2,
      maximumParallelJobs: 2,
    });
  });

  it("rejects unknown dependencies and dependency cycles", () => {
    expect(() =>
      planProductionFabric({
        title: "Invalid",
        jobs: [{ id: "a", title: "A", lane: "one", dependsOn: ["missing"] }],
      }),
    ).toThrow(/unknown job missing/);
    expect(() =>
      planProductionFabric({
        title: "Cycle",
        jobs: [
          { id: "a", title: "A", lane: "one", dependsOn: ["b"] },
          { id: "b", title: "B", lane: "two", dependsOn: ["a"] },
        ],
      }),
    ).toThrow(/dependency cycle/);
  });

  it("executes ready cells concurrently but waits for verified dependencies", async () => {
    const plan = planProductionFabric({
      title: "Execution",
      maxConcurrency: 2,
      jobs: [
        { id: "a", title: "A", lane: "discovery" },
        { id: "b", title: "B", lane: "discovery" },
        { id: "c", title: "C", lane: "delivery", dependsOn: ["a", "b"] },
      ],
    });
    let active = 0;
    let maximumActive = 0;
    const finished: string[] = [];
    const run = await executeProductionFabric(plan, async ({ job }) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      if (job.id === "c") expect(finished.sort()).toEqual(["a", "b"]);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      finished.push(job.id);
      return { output: `${job.id}-output`, evidence: [`${job.id}-receipt`] };
    });

    expect(maximumActive).toBe(2);
    expect(run.status).toBe("completed");
    expect(run.completedJobIds).toEqual(["a", "b", "c"]);
  });

  it("stops downstream work when a worker cannot produce evidence", async () => {
    const plan = planProductionFabric({
      title: "Evidence gate",
      jobs: [
        { id: "build", title: "Build", lane: "development" },
        {
          id: "ship",
          title: "Ship",
          lane: "operations",
          dependsOn: ["build"],
        },
      ],
    });
    const run = await executeProductionFabric(plan, async ({ job }) => ({
      output: job.id,
      evidence: [],
    }));

    expect(run.status).toBe("failed");
    expect(run.failedJobIds).toEqual(["build"]);
    expect(run.blockedJobIds).toEqual(["ship"]);
  });
});
