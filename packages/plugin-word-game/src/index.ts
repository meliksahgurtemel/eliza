import { Plugin } from "@ai16z/eliza";
import { guessWord } from "./actions/guessWord";
import { requestHint } from "./actions/requestHint";
import { gameState } from "./providers/gameState";

export const wordGamePlugin: Plugin = {
  name: "word-game",
  description: "A word guessing game plugin that allows players to guess a daily word with limited attempts and hints",
  actions: [guessWord],
  providers: [gameState]
};
