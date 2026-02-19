
import * as XLSX from 'xlsx';
import { KBEntry } from '../types';

/**
 * Processa o buffer do Excel para extrair as colunas necessárias.
 */
const processWorkbook = (data: Uint8Array): KBEntry[] => {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

  return jsonData
    .map((row) => ({
      error: row['Qual o seu erro?'] || row['Erro'] || row['Pergunta'] || '',
      response: row['Resposta'] || row['Solução'] || '',
    }))
    .filter((entry) => entry.error && entry.response);
};

/**
 * Busca e processa o arquivo Excel diretamente de uma URL.
 */
export const fetchKBFromURL = async (url: string): Promise<KBEntry[]> => {
  try {
    // Ajusta o link do SharePoint para forçar o download direto do arquivo
    let downloadUrl = url;
    if (url.includes('sharepoint.com')) {
      downloadUrl = url.split('?')[0] + '?download=1';
    }
    
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Erro HTTP! Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    return processWorkbook(data);
  } catch (err) {
    console.error("Erro ao buscar base remota:", err);
    throw new Error("Não foi possível acessar a base de conhecimento. Verifique as permissões do link no SharePoint (deve estar como 'Qualquer pessoa com o link').");
  }
};

export const getErrorListString = (entries: KBEntry[]): string => {
  return entries.map((e, i) => `${i + 1}. ${e.error}`).join('\n');
};
