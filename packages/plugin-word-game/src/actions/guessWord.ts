import { Action, ActionExample, booleanFooter, elizaLogger, generateText, generateTrueOrFalse, HandlerCallback, IAgentRuntime, Memory, ModelClass, State } from "@ai16z/eliza";
import { getPlayerState, updatePlayerState } from "../utils/stateManager";
import { getDailyWord } from "../utils/wordManager";

export const guessWord: Action = {
  name: "GUESS_WORD",
  description: "Use this action when a user is trying or attempting to guess a word",
  similes: ["GUESS_THE_WORD", "GUESS_THE_DAILY_WORD", "GUESS_THE_DAILY_WORD"],
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ) => {
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    elizaLogger.info(
        "guessWord",
        message.content.text
    );

    const messageText = message.content.text;

    const isGuessTemplate = `
        We conduct a word guessing game daily.
        We set a daily word and ask users to guess it.

        Decide if the user is trying to guess the daily word by checking the user's message.
        The user's message is: ${messageText}

        Is the user trying or attempting to guess a word?
    ` + booleanFooter;

    const isGuess = await generateTrueOrFalse({
      context: isGuessTemplate,
      modelClass: ModelClass.SMALL,
      runtime,
    });

    elizaLogger.info(
        "isGuess",
        isGuess
    );

    if (!isGuess) {
      return;
    }

    await runtime.messageManager.createMemory({
        userId: message.userId,
        agentId: runtime.agentId,
        content: {
          text: messageText
        },
        roomId: message.roomId
    });

    const guessedWordTemplate = `
        We conduct a word guessing game daily.
        We set a daily word and ask users to guess it.
        Right now, a user is trying to guess the daily word and
        has sent the following message: ${messageText}

        Please extract the guessed word from the user's message.
        The user's message is: ${messageText}

        Only respond with the guessed word, do not include any other text.
    `;

    const guessedWord = await generateText({
      context: guessedWordTemplate,
      modelClass: ModelClass.SMALL,
      runtime,
    });

    const dailyWord = await getDailyWord(runtime, message);
    if (!dailyWord) {
      await callback({
        text: "Sorry, there seems to be an issue with today's word. Please try again later."
      });
      return;
    }

    const isCorrect = guessedWord === dailyWord;
    elizaLogger.info(
        "guessedWord",
        guessedWord
    );
    elizaLogger.info(
        "dailyWord",
        dailyWord
    );

    if (isCorrect) {
        await callback({
            text: "Congratulations! You guessed the daily word correctly."
        });
    } else {
        await callback({
            text: "Sorry, that's not the correct word. Try again!"
        });
    }

    return;
  },
  examples: [
    [
        {
            user: "{{user1}}",
            content: {
                text: "I guess the word is puzzle",
                action: "GUESS_WORD"
            }
        },
        {
            user: "{{user2}}",
            content: {
                text: "Yes, today's word is puzzle!"
            }
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Is it game?",
                action: "GUESS_WORD"
            }
        },
        {
            user: "{{user2}}",
            content: {
                text: "No, today's word is not game. Let's try again."
            }
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "The word must be think",
                action: "GUESS_WORD"
            }
        },
        {
            user: "{{user2}}",
            content: {
                text: "Sorry, that's not the correct word. Try again!"
            }
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Could today's word be solve?",
                action: "GUESS_WORD"
            }
        },
        {
            user: "{{user2}}",
            content: {
                text: "Congratulations! You guessed the daily word correctly."
            }
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "My guess for today is brain",
                action: "GUESS_WORD"
            }
        },
        {
            user: "{{user2}}",
            content: {
                text: "No, today's word is not brain. Keep trying!"
            }
        }
    ]
  ] as ActionExample[][],
};