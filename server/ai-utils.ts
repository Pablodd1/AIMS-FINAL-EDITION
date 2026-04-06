import OpenAI from 'openai';
import { storage } from './storage';
import { logError } from './logger';

export type AIProvider = 'openai' | 'kimi' | 'gemini';

export interface AIClientConfig {
  client: OpenAI;
  model: string;
  provider: AIProvider;
}

/**
 * Gets an OpenAI-compatible client and model name based on global settings or user preferences.
 */
export async function getAIClient(userId?: number): Promise<AIClientConfig | null> {
  try {
    // 1. Check if user wants to use their own API key (Only works for OpenAI currently)
    if (userId) {
      const user = await storage.getUser(userId);
      if (user?.useOwnApiKey) {
        const userApiKey = await storage.getUserApiKey(userId);
        if (userApiKey) {
          return {
            client: new OpenAI({ apiKey: userApiKey }),
            model: 'gpt-4o',
            provider: 'openai'
          };
        }
      }
    }

    // 2. Check Global Provider Setting
    const provider = (await storage.getSystemSetting('global_ai_provider')) as AIProvider || 'openai';

    if (provider === 'kimi') {
      const kimiApiKey = await storage.getSystemSetting('global_kimi_api_key') || process.env.KIMI_API_KEY;
      if (kimiApiKey) {
        return {
          client: new OpenAI({
            apiKey: kimiApiKey,
            baseURL: 'https://api.moonshot.cn/v1'
          }),
          model: 'moonshot-v1-8k', // Default Kimi model, can be made configurable
          provider: 'kimi'
        };
      }
    }

    // 3. Default to OpenAI Global Key
    const globalApiKey = await storage.getSystemSetting('global_openai_api_key') || process.env.OPENAI_API_KEY;
    if (globalApiKey && !['YOUR_KEY_HERE', 'sk-dummy-key', 'mock'].includes(globalApiKey)) {
      return {
        client: new OpenAI({ apiKey: globalApiKey }),
        model: 'gpt-4o',
        provider: 'openai'
      };
    }

    return null;
  } catch (error) {
    logError('Error creating AI client:', error as Error);
    return null;
  }
}
