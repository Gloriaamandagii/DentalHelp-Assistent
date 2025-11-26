const axios = require("axios");
const fs = require("fs");
const path = require("path");
//require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// cache the base prompt so we don't read the file every request
let cachedBasePrompt = null;

async function generateReplyFromGemini(
  userMessage,
  senderName = null,
  options = {}
) {
  if (!GEMINI_API_KEY) {
    return "API key belum dikonfigurasi. Silakan set environment variable GEMINI_API_KEY.";
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  // baca base prompt pertama kali saja
  let basePrompt = "";
  const defaultPrompt =
    "Kamu adalah DentalHelp-Assistant, seorang asisten dokter gigi yang sopan, jelas, dan membantu, khususnya dalam penanganan awal masalah gigi.";

  if (cachedBasePrompt === null) {
    try {
      const promptPath = path.join(__dirname, "..", "prompts", "prompt.md");
      const fileContent = fs.readFileSync(promptPath, "utf8") || "";
      cachedBasePrompt =
        fileContent && fileContent.trim() ? fileContent : defaultPrompt;
    } catch (e) {
      cachedBasePrompt = defaultPrompt;
    }
  }

  basePrompt = cachedBasePrompt;

  // Nama pengirim (optional)
  const nameContext =
    senderName && senderName !== "-" ? `Nama pengirim: ${senderName}\n` : "";

  // prompt final
  const systemPrompt = `${basePrompt}
${nameContext}Pesan warga: "${userMessage}"`;

  // === PERBAIKAN PALING PENTING ===
  // Gemini *WAJIB* pakai role: "user"
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
    ],

    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  };

  try {
    const response = await axios.post(endpoint, requestBody);

    const reply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Tidak ada respons dari model.";

    return reply;
  } catch (err) {
    console.error("Gemini API Error:", err.response?.data || err.message);
    return "Mohon maaf, layanan AI saat ini tidak tersedia.";
  }
}

module.exports = { generateReplyFromGemini };
