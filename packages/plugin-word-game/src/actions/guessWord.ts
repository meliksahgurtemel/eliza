import { Action, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { getPlayerState, updatePlayerState } from "../utils/stateManager";
import { getDailyWord } from "../utils/wordManager";

export const guessWord: Action = {
  name: "guessWord",
  description: "Use this action to process user's guess only if user tries to guess the word",
  similes: ["GUESS_WORD", "GUESS_THE_WORD", "GUESS_THE_DAILY_WORD", "GUESS_THE_DAILY_WORD"],
  examples: [
    [{
      user: "player",
      content: {
        text: "I guess the word is 'puzzle'"
      }
    }, {
      user: "assistant",
      content: {
        text: "Let me check if 'puzzle' is today's word..."
      }
    }],
    [{
      user: "player",
      content: {
        text: "Is it 'game'?"
      }
    }, {
      user: "assistant",
      content: {
        text: "I'll verify if 'game' is the correct word..."
      }
    }]
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    return true
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const guess = message.content.text.toLowerCase().match(/['"]([^'"]+)['"]/)?.[1];
    if (!guess) return { text: "Please provide your guess in quotes, like: I guess 'word'" };

    const dailyWord = await getDailyWord(runtime, message);
    if (!dailyWord) {
      return { text: "Sorry, there seems to be an issue with today's word. Please try again later." };
    }

    const playerState = await getPlayerState(runtime, message);
    if (playerState.needsPayment) {
      return { text: "You've used all your free attempts for today. Please purchase more attempts to continue playing." };
    }

    const updatedState = {
      ...playerState,
      attempts: playerState.attempts + 1,
      lastAttemptDate: new Date().toDateString()
    };

    await updatePlayerState(runtime, message, updatedState);

    const correct = guess === dailyWord;
    const attemptsRemaining = Math.max(0, 3 - updatedState.attempts);

    return {
      text: correct
        ? `🎉 Congratulations! '${guess}' is correct!`
        : `Sorry, '${guess}' is not correct. You have ${attemptsRemaining} attempts remaining.`
    };
  }
};