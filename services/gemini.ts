
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getInventoryInsights = async (query: string, inventory: Product[]) => {
  try {
    const inventoryContext = JSON.stringify(inventory.map(i => ({
      name: i.name,
      location: i.location,
      quantity: i.quantity,
      responsible: i.responsible,
      since: i.arrivalDate
    })));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Contexto del inventario: ${inventoryContext}\n\nPregunta del usuario: ${query}`,
      config: {
        systemInstruction: "Eres un asistente experto en logística. Responde de forma concisa y profesional a las consultas sobre el inventario actual. Si te preguntan por un producto específico, da detalles exactos basados en la lista proporcionada. Si la información no está, dilo amablemente.",
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Lo siento, hubo un error al procesar tu consulta con la IA. Por favor, revisa manualmente los datos.";
  }
};
