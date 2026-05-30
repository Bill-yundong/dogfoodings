import type { NextApiRequest, NextApiResponse } from "next";
import { generateMasterKey, createSecureBackup } from "@/lib/crypto";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const masterKey = generateMasterKey();
    const backup = createSecureBackup(masterKey, password);

    return res.status(200).json({
      masterKey,
      backup,
    });
  } catch (error) {
    return res.status(500).json({ error: `Key generation failed: ${error}` });
  }
}
