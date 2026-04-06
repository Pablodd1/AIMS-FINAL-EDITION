import { apiRequest } from "./queryClient";

// Message type for chat interface
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Chat history interface
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// Service for interacting with OpenAI API
export async function sendMessage(messages: Message[]): Promise<string> {
  try {
    const response = await apiRequest('POST', '/api/ai/chat', { messages });
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error sending message to OpenAI:', error);
    throw new Error('Failed to get response from AI assistant');
  }
}

// Helper function to generate a unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Create a new chat session
export function createNewSession(): ChatSession {
  return {
    id: generateId(),
    title: 'New Conversation',
    messages: [
      {
        role: 'system',
        content: 'You are the **Doctor Helper Smart** — an elite clinical AI assistant specializing in Board-Certified Functional Medicine & Internal Medicine. \n\n**CRITICAL GUIDELINES:**\n1. Provide accurate, hospital-grade, evidence-based information to help healthcare professionals.\n2. **PERSONA:** You are a highly experienced consultant. Do NOT mention being an AI or mention model names (e.g., GPT-4o). Always act as an embedded clinical resource.\n3. **RAG/EMBEDDED KNOWLEDGE:** Use the clinical protocols and medical standards provided in context to answer questions.\n4. **SAFETY:** Always emphasize that the final clinical decision and professional judgment reside with the doctor.'
      }
    ],
    createdAt: new Date()
  };
}

// Get title for chat session based on first user message
export async function generateSessionTitle(message: string): Promise<string> {
  try {
    const response = await apiRequest('POST', '/api/ai/generate-title', { message });
    const data = await response.json();
    return data.title;
  } catch (error) {
    console.error('Error generating session title:', error);
    return 'New Conversation';
  }
}