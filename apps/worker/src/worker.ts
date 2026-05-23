import { prisma } from "@codepulse/db";
import { getEnv } from "@codepulse/config";
import { processReviewJob } from "./jobs/ai-review";
import { Redis } from "ioredis";

const env = getEnv();
const redis = new Redis(env.REDIS_URL);

const POLL_INTERVAL_MS = 3000;
const MAX_CONCURRENT_JOBS = 3;

let activeJobs = 0;

/**
 * Simple queue worker that polls for pending review jobs.
 *
 * In production, you would use Redis Streams or BullMQ for proper
 * queue semantics. This polling approach is simple and correct
 * enough for an MVP / small-scale deployment.
 */
async function pollForJobs(): Promise<void> {
  if (activeJobs >= MAX_CONCURRENT_JOBS) return;

  try {
    // Atomically claim a queued job
    const job = await prisma.aiReviewJob.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    });

    if (!job) return;

    // Mark as running
    const claimed = await prisma.aiReviewJob.updateMany({
      where: { id: job.id, status: "queued" },
      data: { status: "running" },
    });

    // If someone else claimed it first, skip
    if (claimed.count === 0) return;

    activeJobs++;
    console.log(`🔬 Processing review job: ${job.id}`);

    // Publish status to Redis for realtime relay
    await redis.publish(
      `review:${job.id}`,
      JSON.stringify({ reviewJobId: job.id, status: "running" })
    );

    try {
      await processReviewJob(job.id);
    } catch (err) {
      console.error(`❌ Review job ${job.id} failed:`, err);
      await prisma.aiReviewJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage:
            err instanceof Error ? err.message : "Unknown error",
          completedAt: new Date(),
        },
      });

      await redis.publish(
        `review:${job.id}`,
        JSON.stringify({
          reviewJobId: job.id,
          status: "failed",
        })
      );
    } finally {
      activeJobs--;
    }
  } catch (err) {
    console.error("Poll error:", err);
  }
}

// ── Main Loop ────────────────────────────────────────────

console.log(`🏭 Worker started. Polling every ${POLL_INTERVAL_MS}ms`);
console.log(`   Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);

setInterval(pollForJobs, POLL_INTERVAL_MS);
pollForJobs(); // Immediate first poll
