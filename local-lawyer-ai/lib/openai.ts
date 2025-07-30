import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export const createEmbedding = async (text: string) => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  })

  return response.data[0].embedding
}

export const generateChatResponse = async (
  message: string,
  context: string[]
) => {
  const systemPrompt = `You are a helpful AI legal assistant. You provide information about local laws and regulations based on the provided context. 

IMPORTANT GUIDELINES:
- Base your answers primarily on the provided legal document context
- If the context doesn't contain relevant information, clearly state this limitation
- Always include disclaimers that this is not legal advice and users should consult with a qualified attorney
- Reference specific sections or parts of the legal documents when possible
- Be precise and factual in your responses
- If a question is outside the scope of local law, acknowledge this

Context from legal documents:
${context.length > 0 ? context.join('\n\n') : 'No relevant legal documents found.'}

Remember to always remind users that this information is for educational purposes only and does not constitute legal advice.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'
}