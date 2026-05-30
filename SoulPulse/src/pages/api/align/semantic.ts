import type { NextApiRequest, NextApiResponse } from "next";
import { semanticAlignmentEngine } from "@/lib/semanticAlignment";
import { LinguisticFeatures, PhysiologicalData } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { linguisticFeatures, sentimentScore, physiologicalData } = req.body;

    if (!linguisticFeatures) {
      return res.status(400).json({ error: "Linguistic features are required" });
    }

    const alignment = semanticAlignmentEngine.alignSemantics(
      linguisticFeatures as LinguisticFeatures,
      sentimentScore as number,
      physiologicalData as PhysiologicalData
    );

    return res.status(200).json(alignment);
  } catch (error) {
    return res.status(500).json({ error: `Semantic alignment failed: ${error}` });
  }
}
