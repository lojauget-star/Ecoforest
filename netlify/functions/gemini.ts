import { GoogleGenAI } from '@google/genai';

export const handler = async (event: any) => {
  // Apenas aceita requisições POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { model, contents, config } = body;

    // A chave deve estar configurada nas variáveis de ambiente do Netlify
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Chave da API do Gemini não configurada no Netlify.' })
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text })
    };
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Falha ao gerar conteúdo' })
    };
  }
};
