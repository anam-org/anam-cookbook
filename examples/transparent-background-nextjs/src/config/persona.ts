const defaultVoiceId = "6af524f7-68e3-4ecd-933d-c06e3d8ef9b8";
const defaultLlmId = "0934d97d-0c3a-4f33-91b0-5e136a0ef466";
const defaultAvatarModel = "cara-4-latest";

export function buildPersonaConfig() {
  const avatarId = process.env.ANAM_AVATAR_ID;

  if (!avatarId) {
    throw new Error("ANAM_AVATAR_ID is not configured");
  }

  return {
    name: "Transparent Background Concierge",
    avatarId,
    avatarModel: process.env.ANAM_AVATAR_MODEL || defaultAvatarModel,
    voiceId: process.env.ANAM_VOICE_ID || defaultVoiceId,
    llmId: process.env.ANAM_LLM_ID || defaultLlmId,
    systemPrompt: `You are a concise product concierge embedded directly into a website.
If the user asks to change the setting, mood, or backdrop, call set_showcase_scene.
Keep spoken replies short and useful.`,
    tools: [
      {
        type: "client",
        name: "set_showcase_scene",
        description:
          "Change the page scene behind the transparent avatar when the user asks for a different background, setting, mood, or use case.",
        parameters: {
          type: "object",
          properties: {
            scene: {
              type: "string",
              enum: ["docs", "studio", "product"],
              description: "The scene to show behind the avatar.",
            },
          },
          required: ["scene"],
        },
      },
    ],
  };
}
