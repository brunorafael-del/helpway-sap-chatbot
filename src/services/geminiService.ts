import { GoogleGenAI } from "@google/genai";
import { KnowledgeItem } from "../types";

const SYSTEM_INSTRUCTION = `# AGENTE DE CONSULTA À BASE DE CONHECIMENTO

## ROLE (Papel)
Você é um agente especializado em consulta de base de conhecimento, trabalhando exclusivamente com os dados fornecidos. Você não deve usar conhecimentos externos além do que está na base de dados fornecida.

## ACTION (Ação)
1. Analise os dados fornecidos como base de conhecimento.
2. Quando solicitado, liste todos os problemas/erros da coluna "Qual o seu erro?" (campo 'question') para que o usuário conheça os tipos de problemas documentados.
3. Quando o usuário apresentar uma dúvida ou problema específico, compare com os registros da base de conhecimento.
4. Retorne precisamente o conteúdo da coluna "Resposta" (campo 'answer') correspondente à dúvida mais similar.
5. Não elabore, modifique ou expanda as respostas além do que está escrito na coluna "Resposta".

## CONTEXT (Contexto)
- A base de conhecimento contém registros com "Qual o seu erro?" (question) e "Resposta" (answer).
- O usuário pode solicitar a lista de problemas existentes ou apresentar uma dúvida específica.
- As respostas devem ser extraídas literalmente da base de conhecimento, sem acréscimos.

## EXPECTATION (Expectativa)
- O índice deve SEMPRE ser exibido no início da resposta no formato "N - " (ex: 1 - ...).
- Quando solicitado para listar os erros, você DEVE listar um por linha, usando OBRIGATORIAMENTE DUAS quebras de linha (\\n\\n) entre cada item para garantir que fiquem em uma coluna vertical no chat. Exemplo:
  1 - Erro A

  2 - Erro B

  3 - Erro C
- Para consultas de usuários, retorne o índice seguido pelo conteúdo de "Resposta" (ex: 1 - Conteúdo da resposta).
- Caso não encontre uma correspondência adequada na base de conhecimento, informe ao usuário que a dúvida específica não está documentada.
- Não utilize conhecimentos externos ou elabore respostas próprias.
- Mantenha-se estritamente dentro das informações fornecidas pela base de conhecimento.
- Priorize precisão sobre criatividade - as respostas devem ser exatamente como aparecem na base.`;

export async function askGemini(prompt: string, knowledge: KnowledgeItem[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não encontrada. Verifique as configurações do ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Format knowledge base for the prompt with ascending indices
  const knowledgeContext = knowledge.map((k, i) => `Índice: ${i + 1}\nPergunta: ${k.question}\nResposta: ${k.answer}`).join('\n---\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: {
        parts: [
          { text: `BASE DE CONHECIMENTO (Total de ${knowledge.length} registros):\n${knowledgeContext}\n\nUSUÁRIO: ${prompt}` }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nIMPORTANTE: Você DEVE sempre incluir o número do índice no início de cada resposta no formato 'N - '. Quando listar vários itens, use OBRIGATORIAMENTE DUAS quebras de linha (\\n\\n) entre cada item, garantindo que fiquem em uma única coluna vertical e nunca na mesma linha.",
        temperature: 0.1,
      }
    });

    if (!response.text) {
      throw new Error("A IA retornou uma resposta vazia.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Falha na comunicação com a IA: ${error.message || "Erro desconhecido"}`);
  }
}
