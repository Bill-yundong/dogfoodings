import type { NextApiRequest, NextApiResponse } from "next";
import { sentimentEngine } from "@/lib/sentiment";
import { EmotionType } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, title, tags, mood } = req.body;

    if (!text && !title) {
      return res.status(400).json({ error: "Text or title is required" });
    }

    const fullText = `${title || ""}\n${text || ""}\n${(tags || []).join(" ")}`;

    if (mood) {
      const analysis = await sentimentEngine.analyzeEntry(
        title || "",
        text || "",
        tags || [],
        mood as EmotionType
      );
      return res.status(200).json(analysis);
    }

    const analysis = await sentimentEngine.analyze(fullText);
    return res.status(200).json(analysis);
  } catch (error) {
    return res.status(500).json({ error: `Analysis failed: ${error}` });
  }
}
