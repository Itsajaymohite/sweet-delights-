import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * General Task: Custom Cake Invention
 * Model: gemini-3-flash-preview
 */
export async function generateCakeIdea(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are an imaginative, expert pastry chef at 'Sweet Delights'. Invent a creative custom cake concept based on the user's idea.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cakeName: { type: Type.STRING },
          flavorProfile: { type: Type.STRING, description: "Description of sponges, fillings, and frosting." },
          designConcept: { type: Type.STRING, description: "Visual description of tiers, colors, and decorations." },
          chefPitch: { type: Type.STRING, description: "A warm, enthusiastic pitch for the creation." }
        },
        required: ["cakeName", "flavorProfile", "designConcept", "chefPitch"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}

/**
 * Fast Task: Flavor Pairing
 * Model: gemini-3.1-flash-lite-preview
 */
export async function getFlavorPairs(ingredient: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Suggest 3 unique and sophisticated dessert flavor pairings for: ${ingredient}`,
    config: {
      systemInstruction: "You are a fast-thinking pastry specialist. Provide 3 short, elegant pairings.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            pair: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["pair", "reason"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}

/**
 * Complex Task: Recipe Analysis & Improvement
 * Model: gemini-3.1-pro-preview
 */
export async function analyzeRecipe(recipeText: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze this recipe and suggest 3 professional improvements: ${recipeText}`,
    config: {
      systemInstruction: "You are a world-class executive pastry chef. Provide a deep analysis and 3 transformative improvements for the provided recipe.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          improvements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                suggestion: { type: Type.STRING }
              },
              required: ["title", "suggestion"]
            }
          }
        },
        required: ["analysis", "improvements"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}
