
import { GoogleGenAI } from "@google/genai";
import { KBEntry } from "../types";

const SYSTEM_INSTRUCTION = `
# AGENTE DE CONSULTA À BASE DE CONHECIMENTO (COM NUMERAÇÃO)

## ROLE (Papel)
Você é um agente especializado em consulta de base de conhecimento. Você trabalha exclusivamente com uma lista numerada de problemas e respostas fornecida abaixo.

## ACTION (Ação)
1. Analise a base de conhecimento numerada fornecida no contexto.
2. Cada entrada possui um número identificador (ex: [1], [2]).
3. Quando solicitado para listar os problemas, cite-os com seus respectivos números.
4. Quando o usuário apresentar uma dúvida, identifique a entrada mais similar.
5. Retorne precisamente o conteúdo da coluna "Resposta". **Importante: Comece sua resposta citando o número da entrada correspondente (ex: "Entrada [5]: [Conteúdo da Resposta]")**.
6. Não elabore, modifique ou expanda as respostas.
7. Se o usuário pedir "Fale sobre o erro 3", você deve retornar a resposta da entrada [3].

## CONTEXTO DA BASE DE DADOS (LISTA NUMERADA)
{KB_CONTEXT}

## EXPECTATION (Expectativa)
- Liste problemas de forma organizada e numerada.
- Retorne apenas e exatamente o conteúdo da "Resposta" precedido pelo seu número identificador.
- Caso não encontre correspondência, informe que a dúvida não está documentada.
- Priorize precisão absoluta.
`;

export const getChatbotResponse = async (
  userMessage: string,
  kbData: KBEntry[]
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Prepare context with explicit numbering
  const kbContext = kbData.map((d, index) => `Entrada [${index + 1}]:\n- Pergunta: ${d.error}\n- Resposta: ${d.response}`).join('\n\n');
  const finalInstruction = SYSTEM_INSTRUCTION.replace("{KB_CONTEXT}", kbContext);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: finalInstruction,
        temperature: 0.1,
      },
    });

    return response.text || "Desculpe, ocorreu um erro ao gerar a resposta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ocorreu um erro na comunicação com o servidor de IA.";
  }
};
