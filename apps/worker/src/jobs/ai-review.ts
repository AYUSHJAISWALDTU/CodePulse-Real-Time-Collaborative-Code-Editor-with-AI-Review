import OpenAI from "openai";
import { prisma } from "@codepulse/db";
import { getEnv } from "@codepulse/config";
import { v4 as uuid } from "uuid";
import { buildReviewPrompt } from "../prompts/review-prompt";

const env = getEnv();
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Process a single AI review job.
 *
 * 1. Load snapshot content
 * 2. Build structured prompt
 * 3. Call OpenAI with structured response format
 * 4. Parse findings and persist
 * 5. Update job status
 */
export async function processReviewJob(jobId: string): Promise<void> {
  const startTime = Date.now();

  // Load job with snapshot content
  const job = await prisma.aiReviewJob.findUnique({
    where: { id: jobId },
    include: {
      snapshot: true,
      file: true,
    },
  });

  if (!job) throw new Error(`Job not found: ${jobId}`);

  const code = job.snapshot.textContent;
  const language = job.file.language;
  const filePath = job.file.path;

  // If API key is not configured, fallback to a mock review for the demo
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes("your-openai-key")) {
    console.log(`Mocking AI review for job ${jobId} (No valid API key)`);
    await new Promise((r) => setTimeout(r, 2000)); // Simulate delay
    
    const mockFindings = [
      {
        id: uuid(),
        reviewJobId: jobId,
        severity: "medium",
        category: "bug",
        title: "Missing Error Handling",
        explanation: "This is a simulated review because no valid OpenAI API key was configured. Add try/catch blocks to make your code more robust.",
        suggestion: "Wrap the execution in a try/catch block.",
        startLine: 1,
        endLine: 3,
        confidence: null,
      },
      {
        id: uuid(),
        reviewJobId: jobId,
        severity: "low",
        category: "readability",
        title: "Use strict equality",
        explanation: "Always use === instead of == to avoid type coercion bugs.",
        suggestion: "Change == to ===",
        startLine: null,
        endLine: null,
        confidence: null,
      }
    ];

    await prisma.aiReviewFinding.createMany({ data: mockFindings });

    await prisma.aiReviewJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        summary: "Mock review completed. Please configure a real OPENAI_API_KEY in .env for actual AI reviews.",
        latencyMs: 2000,
        completedAt: new Date(),
      },
    });
    return;
  }

  // Build the prompt
  const { systemPrompt, userPrompt } = buildReviewPrompt({
    code,
    language,
    filePath,
  });

  let response;
  try {
    // Call OpenAI
    response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });
  } catch (err: any) {
    console.error("OpenAI API error:", err.message);
    console.log(`Falling back to mock review for job ${jobId} due to API error (likely free-tier limitation).`);
    
    const mockFindings = [
      {
        id: uuid(),
        reviewJobId: jobId,
        severity: "medium",
        category: "bug",
        title: "API Error Fallback (Mock Review)",
        explanation: `OpenAI returned an error: ${err.message}. Showing a simulated review.`,
        suggestion: "Ensure your API key has credits or supports the configured model.",
        startLine: 1,
        endLine: 3,
        confidence: null,
      }
    ];

    await prisma.aiReviewFinding.createMany({ data: mockFindings });

    await prisma.aiReviewJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        summary: "Mock review completed (Fell back due to OpenAI API error).",
        latencyMs: Date.now() - startTime,
        completedAt: new Date(),
      },
    });
    return;
  }

  const latencyMs = Date.now() - startTime;
  const usage = response.usage;
  const rawContent = response.choices[0]?.message?.content ?? "{}";

  // Parse structured response
  let parsed: {
    summary: string;
    findings: Array<{
      title: string;
      severity: string;
      category: string;
      startLine: number;
      endLine: number;
      explanation: string;
      suggestion: string;
    }>;
  };

  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }

  // Persist findings
  const findings = (parsed.findings ?? []).map((f) => ({
    id: uuid(),
    reviewJobId: jobId,
    severity: f.severity || "low",
    category: f.category || "readability",
    title: f.title || "Untitled finding",
    explanation: f.explanation || "",
    suggestion: f.suggestion || null,
    startLine: f.startLine ?? null,
    endLine: f.endLine ?? null,
    confidence: null,
  }));

  if (findings.length > 0) {
    await prisma.aiReviewFinding.createMany({ data: findings });
  }

  // Update job status
  await prisma.aiReviewJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      summary: parsed.summary || "Review completed.",
      inputTokens: usage?.prompt_tokens ?? null,
      outputTokens: usage?.completion_tokens ?? null,
      latencyMs,
      completedAt: new Date(),
    },
  });

  console.log(
    `✅ Review ${jobId}: ${findings.length} findings in ${latencyMs}ms ` +
      `(${usage?.total_tokens ?? "?"} tokens)`
  );
}
