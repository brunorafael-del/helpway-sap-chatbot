import { KnowledgeItem, ChatMessage } from "../types";

export async function askGemini(prompt: string, knowledge: KnowledgeItem[], history: ChatMessage[] = []) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        history: history,
        knowledge: knowledge
      })
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao consultar a IA");
      } else {
        const text = await response.text();
        console.error("Backend non-JSON error:", text);
        throw new Error("O servidor retornou um erro inesperado. Verifique se as variáveis de ambiente (TESS_API_KEY) estão configuradas no Vercel.");
      }
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error("AI Service Error:", error);
    throw new Error(`Falha na comunicação com a IA: ${error.message || "Erro desconhecido"}`);
  }
}
