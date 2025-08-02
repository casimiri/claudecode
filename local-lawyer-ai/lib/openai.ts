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
  context: string[],
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = []
) => {
  const systemPrompt = `You are a helpful AI legal assistant specializing in local laws and regulations. You provide accurate, contextual information based on official legal documents.

IMPORTANT GUIDELINES:
- Base your answers primarily on the provided legal document context
- If the context doesn't contain relevant information, clearly state this limitation
- Always include disclaimers that this is not legal advice and users should consult with a qualified attorney
- Reference specific sections or parts of the legal documents when possible
- Be precise and factual in your responses
- If a question is outside the scope of local law, acknowledge this
- Maintain conversation context while staying focused on legal matters
- Provide helpful follow-up suggestions when appropriate

Context from legal documents:
${context.length > 0 ? context.join('\n\n') : 'No relevant legal documents found in the database for this query.'}

Remember: This information is for educational purposes only and does not constitute legal advice. Users should consult with a qualified attorney for specific legal matters.`

  // Build messages array with conversation history
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.slice(-6), // Keep last 6 messages for context (3 exchanges)
    { role: 'user' as const, content: message },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', // Changed to GPT-3.5 Turbo as requested
    messages,
    temperature: 0.3,
    max_tokens: 1000,
    presence_penalty: 0.1,
    frequency_penalty: 0.1,
  })

  return {
    content: response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.',
    usage: response.usage
  }
}