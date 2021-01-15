import { ACCEPT_EMOJI, DECLINE_EMOJI } from ".";
import { Message, MessageReaction, User } from "discord.js";

export function* createRange(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}

export function logMessage(msg: Message) {
  console.log(
    `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content}`
  );
}

export const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min) + min);
export const getRandomElement = <T>(arr: T[]) => arr[randomInt(0, arr.length)];

/**
 * @param msg Received message
 * @param prompt Question to ask for confirmation
 * @param onAccept Callback on accept
 * @param onDecline Callback on decline
 * @param timeout Timeout for waiting confirmation
 */
export async function askConfirmation(
  msg: Message,
  prompt: string,
  onAccept: () => any,
  timeout?: number
): Promise<void>;

export async function askConfirmation(
  msg: Message,
  prompt: string,
  onAccept: () => any,
  onDecline: () => any,
  timeout?: number
): Promise<void>;

export async function askConfirmation(
  msg: Message,
  prompt: string,
  onAccept: () => any,
  onDeclineOrTimeout?: (() => any) | number,
  timeout?: number
) {
  const reply = await msg.reply(prompt);

  // Add reactions for confirming action
  await reply.react(ACCEPT_EMOJI);
  await reply.react(DECLINE_EMOJI);
  // Await click on reaction
  try {
    const reactions = await reply.awaitReactions(
      (reaction: MessageReaction, user: User) =>
        user.id === msg.author.id &&
        [ACCEPT_EMOJI, DECLINE_EMOJI].includes(reaction.emoji.name),
      {
        max: 1,
        time:
          timeout ??
          (typeof onDeclineOrTimeout === "number"
            ? onDeclineOrTimeout
            : null) ??
          30e3
      }
    );
    const reaction = reactions.find(reaction =>
      reaction.users.cache.has(msg.author.id)
    );
    if (reaction?.emoji.name === ACCEPT_EMOJI) {
      await onAccept();
    } else if (reaction?.emoji.name === DECLINE_EMOJI) {
      if (onDeclineOrTimeout instanceof Function) await onDeclineOrTimeout();
    }
  } catch (e) {
    Error.captureStackTrace(e);
    console.error(e);
  }
  await reply.delete();
}
