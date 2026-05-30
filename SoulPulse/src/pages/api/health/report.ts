import type { NextApiRequest, NextApiResponse } from "next";
import { healthIntegrationService } from "@/lib/healthIntegration";
import { DiaryEntry, HealthProfile } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { entries, profile, timeframe = "month" } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Entries array is required" });
    }

    if (!profile) {
      return res.status(400).json({ error: "Health profile is required" });
    }

    const report = healthIntegrationService.generateHealthReport(
      entries as DiaryEntry[],
      profile as HealthProfile,
      timeframe as "week" | "month" | "year"
    );

    return res.status(200).json(report);
  } catch (error) {
    return res.status(500).json({ error: `Report generation failed: ${error}` });
  }
}
