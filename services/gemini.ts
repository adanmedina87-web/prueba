
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

// Always initialize with a named parameter and use process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // Access the .text property directly
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Lo siento, hubo un error al procesar tu consulta con la IA. Por favor, revisa manualmente los datos.";
  }
};

export const getCalendarEvents = async (calendarUrl: string) => {
  try {
    const now = new Date();
    const todayStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const monthStr = now.toLocaleDateString('es-ES', { month: 'long' });
    const year = now.getFullYear();

    // Use gemini-3-pro-preview for complex reasoning/parsing tasks using tools
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Analiza el calendario en formato iCal (.ics) en la URL: ${calendarUrl}. 
      Hoy es ${todayStr}.
      
      Necesito extraer las actividades para:
      1. El día de hoy (${todayStr}).
      2. Lo que queda del mes de ${monthStr} del ${year}.
      
      Reglas:
      - Indica las actividades con su fecha respectiva.
      - Si hay actividades hoy, lístalas indicando "HOY: [Título]".
      - Si no hay hoy, pero hay en el mes, lístalas indicando su fecha "[Día]: [Título]".
      - Si no hay actividades hoy NI en lo que resta del mes, responde estrictamente con: 'SIN ACTIVIDADES EN LO QUE RESTA DE MES'.
      - La respuesta debe ser una lista muy concisa (una sola línea o ítems cortos). Sin introducciones ni conclusiones.`,
      config: {
        systemInstruction: "Eres un asistente de información escolar preciso. Extraes eventos de archivos iCal públicos y devuelves una lista simple y corta.",
        tools: [{googleSearch: {}}]
      }
    });

    // Mandatory: Extract grounding metadata URLs when using googleSearch
    const text = response.text?.trim() || "SIN ACTIVIDADES EN LO QUE RESTA DE MES";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => ({
        title: chunk.web?.title || chunk.web?.uri,
        uri: chunk.web?.uri
      }))
      .filter((s: any) => s.uri);

    return { text, sources };
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return { text: "SIN ACTIVIDADES EN LO QUE RESTA DE MES", sources: [] };
  }
};
