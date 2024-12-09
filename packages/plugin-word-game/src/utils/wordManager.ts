import { IAgentRuntime, Memory, elizaLogger } from "@ai16z/eliza";

const WORD_CACHE_KEY = "DAILY_WORD";

export async function getDailyWord(runtime: IAgentRuntime, message: Memory): Promise<string | null> {
  const today = new Date().toDateString();
  const cacheKey = `${WORD_CACHE_KEY}_${today}`;

  // Try to get today's word from cache
  const cached = await runtime.cacheManager.get<{ word: string; setAt: number }>(cacheKey);

  if (cached) {
    return cached.word;
  }

  // If no word is set for today, set a new one
  return setDailyWord(runtime, message);
}

export async function setDailyWord(runtime: IAgentRuntime, message: Memory): Promise<string> {
  const today = new Date().toDateString();
  const cacheKey = `${WORD_CACHE_KEY}_${today}`;

  // Default word list in case we need a fallback
  const defaultWords = [
    "puzzle", "game", "word", "play", "fun",
    "guess", "solve", "think", "mind", "brain"
  ];

  // Get a random word from the default list
  const defaultWord = defaultWords[Math.floor(Math.random() * defaultWords.length)];

  // Store the word in cache
  const wordData = {
    word: defaultWord,
    setAt: Date.now()
  };

  await runtime.cacheManager.set(cacheKey, wordData, {
    expires: 24 * 60 * 60 // 24 hours in seconds
  });

  elizaLogger.success(
    "Daily word",
    wordData.word,
    wordData.setAt
  );

  // Also store in messages for backup/history
  await runtime.messageManager.createMemory({
    userId: message.userId,
    agentId: runtime.agentId,
    roomId: message.roomId,
    content: {
      text: `Daily word set for ${today}`,
      action: "SET_DAILY_WORD",
      wordData
    },
    createdAt: Date.now(),
    unique: true
  });

  return defaultWord;
}

export async function clearDailyWord(runtime: IAgentRuntime): Promise<void> {
  const today = new Date().toDateString();
  const cacheKey = `${WORD_CACHE_KEY}_${today}`;

  await runtime.cacheManager.delete(cacheKey);
}

export function shouldResetWord(lastUpdated: Date): boolean {
  const now = new Date();
  return now.toDateString() !== lastUpdated.toDateString();
}