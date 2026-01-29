/**
 * Persona Configuration for Custom LLM Mode
 *
 * In custom LLM mode, Anam handles speech-to-text and text-to-speech while
 * you provide your own language model responses. The llmId must be set to
 * CUSTOMER_CLIENT_V1 to disable the built-in LLM.
 */

export const personaConfig = {
  // Avatar appearance - the visual character
  avatarId: "edf6fdcb-acab-44b8-b974-ded72665ee26", // Mia

  // Voice - how the avatar sounds
  voiceId: "6bfbe25a-979d-40f3-a92b-5394170af54b", // Cara

  // CUSTOMER_CLIENT_V1 disables the built-in LLM so you can provide responses
  llmId: "CUSTOMER_CLIENT_V1",
};

/**
 * System prompt for your LLM.
 * This is handled on your side, not sent to Anam.
 */
export const systemPrompt = `You are a friendly AI assistant powered by a custom language model. Keep your responses concise and conversational since they will be spoken aloud.`;
