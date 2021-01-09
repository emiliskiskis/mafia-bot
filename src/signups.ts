import { MAX_PLAYERS, Player, narratorId } from ".";
import { Message, TextChannel } from "discord.js";
import { addDays, closestTo, differenceInMinutes, parse } from "date-fns";
import { askConfirmation, createRange } from "./util";

import { zonedTimeToUtc } from "date-fns-tz";

let channelCategoryId: string | null = null;
let signupChannelId: string | null = null;
let phaseTime: string | null = null;

/*
  Required checks to set the signup channel:
  1. The user has to have sufficient permissions in the server
  2. The command has to be executed in a text channel
  3. The text channel has to be in a channel category
  4. If signup channel already set - ask to confirm the action
  5. If the new signup channel is the same as the old one, discard the action
*/
export async function setSignupChannel(msg: Message) {
  // Check if user has sufficient permissions in the server
  // TODO

  // Check if command is executed in a text channel
  if (!(msg.channel instanceof TextChannel)) {
    msg.reply("the command only works in a server text channel.");
    return;
  }

  // Check if text channel is in a channel category
  if (!msg.channel.parentID) {
    msg.reply("the text channel has to be in a channel category.");
    return;
  }

  channelCategoryId = msg.channel.parentID;

  // Ask to confirm the action is signup channel already set
  if (signupChannelId !== null) {
    if (signupChannelId === msg.channel.id) {
      await msg.reply(`<#${signupChannelId}> is already the signup channel.`);
      return;
    }

    await askConfirmation(
      msg,
      `<#${signupChannelId}> is already the signup channel. Would you like to replace it?`,
      async () => {
        signupChannelId = msg.channel.id;
        await msg.reply(
          `<#${signupChannelId}> has been set as the signup channel.`
        );
      },
      () => {}
    );
    return;
  }

  signupChannelId = msg.channel.id;
  await msg.reply("signup channel set.");
}

/*
  Required checks to set the narrator:
  1. The user has to have sufficient permissions in the server
  2. The message has to be sent in the signup channel
  4. If narrator is already set - ask to confirm the action
  5. If a narrator parameter is provided, execute checks from that person's perspective as well
  (sufficient permissions, them already being narrator)
  6. If the new narrator is the same as the old one, discard the action
*/
export async function setNarrator(
  msg: Message,
  narratorId: string | null,
  narratorIdSetter: (id: string) => any
) {
  // Check if user has sufficient permissions in the server
  // TODO

  // Check if command is executed in signup channel
  if (msg.channel.id !== signupChannelId) {
    return;
  }

  // Check if user has been tagged
  const matches = msg.content.match(/setnarrator +<@!(\d+)>$/);
  if (matches && matches[1]) {
    // Check if narrator is not set
    if (narratorId === null) {
      await narratorIdSetter(matches[1]);
      msg.reply(`<@!${matches[1]}> has been set as narrator.`);
      return;
    }

    // Check if author is already narrator
    if (narratorId === matches[1]) {
      await msg.reply(`<@!${matches[1]}> is already the narrator.`);
      return;
    }

    // Confirm if want to replace narrator
    await askConfirmation(
      msg,
      `<@!${narratorId}> is already narrator. Would you like to replace this narrator?`,
      async () => {
        await narratorIdSetter(msg.author.id);
        await msg.reply(`<@!${matches[1]}> has been set as narrator.`);
      },
      () => {}
    );
    return;
  }

  // Check if narrator is not set
  if (narratorId === null) {
    await narratorIdSetter(msg.author.id);
    await msg.reply("you have been set as narrator.");
    return;
  }

  // Check if author is already narrator
  if (narratorId === msg.author.id) {
    await msg.reply("you are already the narrator.");
    return;
  }

  // Confirm if want to replace narrator
  await askConfirmation(
    msg,
    `<@!${narratorId}> is already narrator. Would you like to replace this narrator?`,
    async () => {
      await narratorIdSetter(msg.author.id);
      await msg.reply("you have been set as narrator.");
    },
    () => {}
  );
}

/*
  Required checks to leave the game:
  1. The command has to be executed in the signup channel
  2. The player is signed up

  After leaving the game, provide the player list.
*/
export async function leaveGame(msg: Message, players: Player[]) {
  // Check if command is executed in signup channel
  if (msg.channel.id !== signupChannelId) {
    return;
  }

  // Check if player already in players list
  const index = players.findIndex(player => player === msg.author.id);
  if (index === -1) {
    await msg.reply("you have not signed up for the game.");
    return;
  }

  // Remove player from players list
  players.splice(index);
  await msg.reply("you have been removed from the game.");

  // List all players
  await listPlayers(msg, players);
}
/*
  Required checks to list players:
  1. The command has to be executed in the signup channel
*/
export async function listPlayers(
  msg: Message,
  players: Player[],
  final?: boolean // This parameter is ugly
) {
  // Check if command is executed in signup channel
  if (msg.channel.id !== signupChannelId) {
    return;
  }

  // List all players
  if (msg.channel instanceof TextChannel) {
    await msg.channel.send(
      // Map every player to a string of position in list and the current display name of player
      `${final ? "Final list of players:" : "Players:"}
${(
  await Promise.all(
    players.map(
      async (player, index) =>
        `${index + 1}. ${
          (await msg.guild?.members.fetch(player))?.displayName ??
          "[missing name]"
        }`
    )
  )
).join("\n")}
${Array.from(createRange(players.length + 1, MAX_PLAYERS + 1))
  .map(value => `${value}.`)
  .join("\n")}`
    );
  }
}

/*
  Required checks to sign up for the game:
  1. The command has to be executed in the signup channel
  3. The player isn't yet signed up
  2. The player list isn't full

  After signing up, provide the player list.
*/
export async function signUp(msg: Message, players: Player[]) {
  // Check if command is executed in signup channel
  if (msg.channel.id !== signupChannelId) {
    return;
  }

  // Check if player already in players list
  if (players.find(player => player === msg.author.id)) {
    await msg.reply("you are already signed up for the game.");
    return;
  }

  // Check if the player list is full
  if (players.length >= MAX_PLAYERS) {
    await msg.reply("player list is full, sign up for the next game.");
    return;
  }

  // Add player to players list
  players.push(msg.author.id);
  await msg.reply("you have been signed up for the game.");

  // List all players
  await listPlayers(msg, players);
}

/*
  Required checks to set the phase time:
  1. The message author is the narrator
  2. The time format is correct
*/
export async function setPhaseTime(msg: Message) {
  // Check if message author is the narrator
  if (msg.author.id !== narratorId) {
    await msg.reply("you're not the narrator for this game.");
    return;
  }

  const matches = msg.content.match(
    /setphasetime +((?:[01]\d|2[0-3]):([0-5]\d))$/
  );

  // Check if time format is correct
  if (!matches || !matches[1]) {
    await msg.reply("wrong time format, try e.g. 12:00, 05:12.");
    return;
  }

  // Set the phase time
  phaseTime = matches[1];

  await msg.reply(`phase time was set to ${phaseTime}.`);
}

/*
  Required checks to start the game:
  1. There has to be a narrator
  2. The game initiator has to be the narrator
  3. The player list has to be full
  4. The game isn't yet started
  5. The phase time has to be set

  The final player list is listed and the game starts immediately.
  Starting the game means giving everyone a role, set up private chats
    and waiting for next phase to process actions.
*/
export async function startGame(
  msg: Message,
  narratorId: string | null,
  players: Player[]
) {
  // Check if command is executed in signup channel (is it necessary?)
  if (msg.channel.id !== signupChannelId) {
    return;
  }

  // Check if narrator is set for this game
  if (narratorId === null) {
    await msg.reply("no narrator set for this game.");
    return;
  }

  // Check if game initiator is the narrator
  if (msg.author.id !== narratorId) {
    await msg.reply("you're not the narrator for this game.");
    return;
  }

  // Check if the player list is full
  if (players.length < MAX_PLAYERS) {
    await msg.reply("cannot start a game with empty slots.");
    return;
  }

  // Check if the game isn't yet started
  // TODO

  // Check if phase time is set
  if (phaseTime === null) {
    await msg.reply("no phase time set.");
    return;
  }

  // Provide the final list of players
  await listPlayers(msg, players, true);

  // Inform the phase time
  const minutesUntilPhase = differenceInMinutes(
    zonedTimeToUtc(addDays(parse(phaseTime, "HH:mm", new Date()), 1), "UTC"),
    new Date()
  );
  await msg.channel.send(
    `Phase time is in ${Math.floor(minutesUntilPhase / 60)}h ${
      minutesUntilPhase % 60
    }m`
  );
}
