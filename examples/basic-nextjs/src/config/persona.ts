/**
 * Persona Configuration
 *
 * Edit these values to customize your AI avatar's appearance and behavior.
 * Find available avatars and voices at https://lab.anam.ai
 */

export const personaConfig = {
  // Avatar appearance - the visual character
  avatarId: "edf6fdcb-acab-44b8-b974-ded72665ee26", // Mia (female)

  // Voice - how the avatar sounds
  voiceId: "6bfbe25a-979d-40f3-a92b-5394170af54b", // Cara (female)

  // LLM - the AI model powering conversations
  // gpt-4.1-mini is a good balance of speed and quality
  llmId: "0934d97d-0c3a-4f33-91b0-5e136a0ef466", // gpt-4.1-mini

  // System prompt - defines the avatar's personality and behavior
  systemPrompt: `You are a friendly AI assistant. Keep your responses concise and conversational.`,
};
