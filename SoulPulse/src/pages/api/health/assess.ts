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
    const { entries, profile } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Entries array is required" });
    }

    const typedEntries = entries as DiaryEntry[];
    const typedProfile = profile as HealthProfile | undefined;

    const assessment = await healthIntegrationService.assessRisks(
      typedEntries,
      typedProfile
    );

    const strategies = healthIntegrationService.generateCopingStrategies(
      assessment,
      typedEntries
    );

    return res.status(200).json({
      assessment,
      copingStrategies: strategies,
    });
  } catch (error) {
    return res.status(500).json({ error: `Health assessment failed: ${error}` });
  }
}
