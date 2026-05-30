import type { NextApiRequest, NextApiResponse } from "next";
import { emotionTrajectoryEngine } from "@/lib/emotionTrajectory";
import { DiaryEntry, HealthProfile } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { entries, profile, analysisType } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Entries array is required" });
    }

    const typedEntries = entries as DiaryEntry[];
    const trajectory = emotionTrajectoryEngine.buildTrajectory(typedEntries);
    const patterns = emotionTrajectoryEngine.detectPatterns(trajectory);

    let result: any = { trajectory, patterns };

    if (analysisType === "insights" || !analysisType) {
      const insights = emotionTrajectoryEngine.generateInsights(
        typedEntries,
        trajectory,
        patterns,
        profile as HealthProfile
      );
      result.insights = insights;
    }

    if (analysisType === "wellbeing" || !analysisType) {
      const wellbeingScore = emotionTrajectoryEngine.calculateWellbeingScore(
        typedEntries,
        trajectory
      );
      result.wellbeingScore = wellbeingScore;
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: `Trajectory analysis failed: ${error}` });
  }
}
