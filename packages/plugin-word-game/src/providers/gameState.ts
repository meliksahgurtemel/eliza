import { Provider, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { getPlayerState } from "../utils/stateManager";
import { getDailyWord } from "../utils/wordManager";

export const gameState: Provider = {
  async get(runtime: IAgentRuntime, message: Memory, state?: State) {
    const [dailyWord, playerState] = await Promise.all([
      getDailyWord(runtime, message),
      getPlayerState(runtime, message)
    ]);

    return `
Game State:
- Attempts Made: ${playerState.attempts}/3
- Hints Used: ${playerState.hints}/3
- Need Payment: ${playerState.needsPayment ? "Yes" : "No"}
${state?.isAgent ? `- Today's Word: ${dailyWord} (only visible to agent)` : ""}

Remember: You can make up to 3 guesses per day and request up to 3 hints.
    `.trim();
  }
}