import { Action, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { getPlayerState, updatePlayerState } from "../utils/stateManager";
import { getDailyWord } from "../utils/wordManager";

export const requestHint: Action = {
  name: "requestHint",
  description: "Provide a hint if user request",
  similes: ["need help", "give me a clue", "help me guess"],
  examples: [
    [{
      user: "player",
      content: {
        text: "Can I get a hint?"
      }
    }, {
      user: "assistant",
      content: {
        text: "Let me provide you with a helpful clue..."
      }
    }],
    [{
      user: "player",
      content: {
        text: "I need a clue"
      }
    }, {
      user: "assistant",
      content: {
        text: "I'll give you a hint about today's word..."
      }
    }]
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    return true;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const playerState = await getPlayerState(runtime, message);
    if (playerState.hints >= 3) {
      return { text: "You've used all your hints for today." };
    }

    const dailyWord = await getDailyWord(runtime, message);
    if (!dailyWord) {
      return { text: "Sorry, there seems to be an issue with today's word." };
    }

    // Update hint count
    await updatePlayerState(runtime, message, {
      ...playerState,
      hints: playerState.hints + 1
    });

    // Generate contextual hint based on the word
    const hintsRemaining = 2 - playerState.hints;
    return {
      text: `Here's your hint: The word has ${dailyWord.length} letters and is related to [AI generates contextual hint]. You have ${hintsRemaining} hints remaining.`
    };
  }
};