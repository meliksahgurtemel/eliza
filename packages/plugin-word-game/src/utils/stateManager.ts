import { IAgentRuntime, Memory } from "@ai16z/eliza";

interface PlayerState {
  attempts: number;
  hints: number;
  lastAttemptDate: string;
  needsPayment: boolean;
}

export async function getPlayerState(runtime: IAgentRuntime, message: Memory): Promise<PlayerState> {
    const memories = await runtime.messageManager.getMemories({
        roomId: message.roomId,
        count: 1,
        unique: true
    });

    const defaultState = {
        attempts: 0,
        hints: 0,
        lastAttemptDate: new Date().toDateString()
    };

    const state = (memories[0]?.content?.playerState as typeof defaultState) ?? defaultState;

    return {
        ...state,
        needsPayment: state.attempts >= 3
    };
}

export async function updatePlayerState(
  runtime: IAgentRuntime,
  message: Memory,
  state: Omit<PlayerState, 'needsPayment'>
): Promise<void> {
  await runtime.messageManager.createMemory({
    roomId: message.roomId,
    userId: message.userId,
    agentId: runtime.agentId,
    content: {
      text: `Game state update: ${state.attempts} attempts, ${state.hints} hints`,
      playerState: state
    },
    createdAt: Date.now(),
    unique: true
  });
}