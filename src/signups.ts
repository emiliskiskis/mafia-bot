import { GameData, GuildData } from "./data";
import { MAX_PLAYERS, PREFIX, SaveDataFn } from ".";
import { addDays, differenceInMinutes, parse } from "date-fns";
import { askConfirmation, createRange, getRandomElement } from "./util";
import { factions, roleDistribution, roles } from "./roles";

import { Message } from "discord.js";
import { knuthShuffle as shuffle } from "knuth-shuffle";
import { zonedTimeToUtc } from "date-fns-tz";

export async function setNarratorRole(
  msg: Message,
  guildData: GuildData,
  saveGuildData: SaveDataFn<GuildData>
) {
  if (!msg.member?.hasPermission("MANAGE_GUILD")) {
    msg.reply("the command required the Manage Server permission.");
    return;
  }

  // Get tagged role
  const matches = msg.content.match(/setnarratorrole +<@&(\d+)>$/);
  if (!matches || !matches[1]) {
    msg.reply("wrong command syntax.");
    return;
  }

  const { narratorRoleId } = guildData;

  const role = await msg.guild?.roles.fetch(matches[1]);
  if (!role) {
    msg.reply("failed to retrieve role information!");
    return;
  }

  if (narratorRoleId != null) {
    if (narratorRoleId === matches[1]) {
      await msg.reply(`${role.name} is already the narrator role.`);
      return;
    }

    const currentRole = await msg.guild?.roles.fetch(narratorRoleId);
    if (!currentRole) {
      msg.reply("failed to retrieve role information!");
      return;
    }

    await askConfirmation(
      msg,
      `${currentRole.name} is already the narrator role. Would you like to replace it?`,
      async () => {
        // Set new signup channel id
        guildData.narratorRoleId = matches[1];
        await saveGuildData(guildData);
        await msg.reply(`${role.name} has been set as the narrator role.`);
      }
    );

    return;
  }

  guildData.narratorRoleId = matches[1];
  await saveGuildData(guildData);
  await msg.reply(`${role.name} has been set as the narrator role.`);
}

/*
  Required checks to set the signup channel:
  1. The user has to have sufficient permissions in the server
  2. The command has to be executed in a text channel
  3. The text channel has to be in a channel category
  4. If signup channel already set - ask to confirm the action
  5. If the new signup channel is the same as the old one, discard the action
*/
export async function setSignupChannel(
  msg: Message,
  guildData: GuildData,
  gameData: GameData,
  saveGuildData: SaveDataFn<GuildData>,
  saveGameData: SaveDataFn<GameData>
) {
  const { narratorRoleId } = guildData;

  // Check if user has sufficient permissions in the server
  if (!narratorRoleId) {
    msg.reply(
      `a narrator role has to be set with the command ${PREFIX}setnarratorrole.`
    );
    return;
  }
  if (!msg.member?.roles.cache.has(narratorRoleId)) {
    msg.reply(`you do not have permission to be the narrator.`);
    return;
  }

  const { signupChannelId } = gameData;

  // Ask to confirm the action if signup channel is already set
  if (signupChannelId != null) {
    if (signupChannelId === msg.channel.id) {
      await msg.reply(`<#${signupChannelId}> is already the signup channel.`);
      return;
    }

    await askConfirmation(
      msg,
      `<#${signupChannelId}> is already the signup channel. Would you like to replace it?`,
      async () => {
        // Set new signup channel id
        gameData.signupChannelId = msg.channel.id;
        await saveGameData(gameData);
        await msg.reply(
          `<#${msg.channel.id}> has been set as the signup channel.`
        );
      }
    );

    return;
  }

  // Set new signup channel id
  gameData.signupChannelId = msg.channel.id;
  await saveGameData(gameData);
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
  guildData: GuildData,
  gameData: GameData,
  saveGuildData: SaveDataFn<GuildData>,
  saveGameData: SaveDataFn<GameData>
) {
  const { narratorRoleId } = guildData;
  const { narratorId } = gameData;

  // Check if user has sufficient permissions in the server
  if (!narratorRoleId) {
    msg.reply(
      `a narrator role has to be set with the command ${PREFIX}setnarratorrole.`
    );
    return;
  }
  if (!msg.member?.roles.cache.has(narratorRoleId)) {
    msg.reply(`you do not have permission to be the narrator.`);
    return;
  }

  // Check if user has been tagged
  const matches = msg.content.match(/setnarrator +<@!(\d+)>$/);
  if (matches && matches[1]) {
    // Check if narrator is not set
    if (narratorId == null) {
      gameData.narratorId = matches[1];
      await saveGameData(gameData);
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
        gameData.narratorId = matches[1];
        await saveGameData(gameData);
        await msg.reply(`<@!${matches[1]}> has been set as narrator.`);
      }
    );
    return;
  }

  // Check if narrator is not set
  if (narratorId == null) {
    gameData.narratorId = msg.author.id;
    await saveGameData(gameData);
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
      gameData.narratorId = msg.author.id;
      await saveGameData(gameData);
      await msg.reply("you have been set as narrator.");
    }
  );
}

/*
  Required checks to leave the game:
  1. The command has to be executed in the signup channel
  2. The player is signed up

  After leaving the game, provide the player list.
*/
export async function leaveGame(
  msg: Message,
  gameData: GameData,
  saveGameData: SaveDataFn<GameData>
) {
  const { players, signupChannelId } = gameData;

  // Check if command is executed in signup channel
  if (msg.channel.id !== signupChannelId) {
    msg.reply("the command has to be executed in the signup channel.");
    return;
  }

  if (!players) {
    await msg.reply("you have not signed up for the game.");
    return;
  }

  // Check if player already in players list
  const index = players.findIndex(player => player.id === msg.author.id);
  if (index === -1) {
    await msg.reply("you have not signed up for the game.");
    return;
  }

  gameData.players = [...players.slice(0, index), ...players.slice(index + 1)];

  // Remove player from players list
  await saveGameData(gameData);
  await msg.reply("you have been removed from the game.");

  // List all players
  await listPlayers(msg, gameData);
}

/*
  Required checks to list players:
  1. The command has to be executed in the signup channel
*/
export async function listPlayers(
  msg: Message,
  gameData: GameData,
  final?: boolean // This parameter is ugly
) {
  const { players, signupChannelId } = gameData;

  // Check if command is executed in signup channel
  if (msg.channel.id !== signupChannelId) {
    return;
  }

  // List all players
  await msg.channel.send(
    // Map every player to a string of position in list and the current display name of player
    `${final ? "Final list of players:" : "Players:"}
${(
  await Promise.all(
    (players ?? []).map(
      async (player, index) =>
        `${index + 1}. ${
          (await msg.guild?.members.fetch(player.id))?.displayName ??
          "[missing name]"
        }\n`
    )
  )
).join("")}\
${Array.from(createRange((players ?? []).length + 1, MAX_PLAYERS + 1))
  .map(value => `${value}.\n`)
  .join("")}`
  );
}

/*
  Required checks to sign up for the game:
  1. The command has to be executed in the signup channel
  3. The player isn't yet signed up
  2. The player list isn't full

  After signing up, provide the player list.
*/
export async function signUp(
  msg: Message,
  gameData: GameData,
  saveGameData: SaveDataFn<GameData>
) {
  const { players, signupChannelId } = gameData;

  // Check if command is executed in signup channel
  if (msg.channel.id !== signupChannelId) {
    return;
  }

  // Check if player already in players list
  if (players && players.find(player => player.id === msg.author.id)) {
    await msg.reply("you are already signed up for the game.");
    return;
  }

  // Check if the player list is full
  if (players && players.length >= MAX_PLAYERS) {
    await msg.reply("player list is full, sign up for the next game.");
    return;
  }

  // Add player to players list
  gameData.players = [...(players ?? []), { id: msg.author.id }];
  await saveGameData(gameData);
  await msg.reply("you have been signed up for the game.");

  // List all players
  await listPlayers(msg, gameData);
}

/*
  Required checks to set the phase time:
  1. The message author is the narrator
  2. The time format is correct
*/
export async function setPhaseTime(
  msg: Message,
  gameData: GameData,
  saveGameData: SaveDataFn<GameData>
) {
  const { narratorId } = gameData;

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
  gameData.phaseTime = matches[1];
  await saveGameData(gameData);

  // Inform the phase time
  const minutesUntilPhase = differenceInMinutes(
    zonedTimeToUtc(
      addDays(parse(gameData.phaseTime, "HH:mm", new Date()), 1),
      "UTC"
    ),
    new Date()
  );
  await msg.reply(
    `phase time was set to ${gameData.phaseTime} (in ${Math.floor(
      minutesUntilPhase / 60
    )}h ${minutesUntilPhase % 60}m).`
  );
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
  gameData: GameData,
  saveGameData: SaveDataFn<GameData>
) {
  const { phaseTime, players, narratorId, signupChannelId } = gameData;

  // Check if command is executed in signup channel (is it necessary?)
  if (msg.channel.id !== signupChannelId) {
    return;
  }

  // Check if narrator is set for this game
  if (narratorId == null) {
    await msg.reply("no narrator set for this game.");
    return;
  }

  // Check if game initiator is the narrator
  if (msg.author.id !== narratorId) {
    await msg.reply("you're not the narrator for this game.");
    return;
  }

  // Check if the player list is full
  if (!players || players.length < MAX_PLAYERS) {
    await msg.reply("cannot start a game with empty slots.");
    return;
  }

  // TODO: Check if the game isn't yet started

  // Check if phase time is set
  if (phaseTime == null) {
    await msg.reply("no phase time set.");
    return;
  }

  // Provide the final list of players
  await listPlayers(msg, gameData, true);

  const shuffledPlayers = shuffle(Array.from(createRange(0, players.length)));
  if (
    roleDistribution.reduce(
      (acc, distributionPart) => acc + distributionPart.count,
      0
    ) !== players.length
  ) {
    await msg.reply("role distribution does not match the player count.");
    return;
  }

  let i = 0;
  let j = 0;
  roleDistribution.forEach(distributionPart => {
    for (j = 0; j < distributionPart.count; j++) {
      players[shuffledPlayers[i]] = {
        id: players[shuffledPlayers[i]].id,
        role: getRandomElement(
          roles.filter(role => role.faction === distributionPart.faction)
        )
      };
      i++;
    }
  });

  // Log player roles
  console.log(
    // Map every player to a string of position in list and the current display name of player
    `Role list:
${(
  await Promise.all(
    (gameData.players ?? []).map(
      async (player, index) =>
        `${index + 1}. ${
          (await msg.guild?.members.fetch(player.id))?.displayName ??
          "[missing name]"
        } - ${player.role?.title} (${factions[player.role!.faction]})`
    )
  )
).join("\n")}`
  );

  await saveGameData(gameData);

  // Inform the phase time
  const minutesUntilPhase = differenceInMinutes(
    zonedTimeToUtc(addDays(parse(phaseTime, "HH:mm", new Date()), 1), "UTC"),
    new Date()
  );
  await msg.channel.send(
    `Game started. N1 Phase time is in ${Math.floor(minutesUntilPhase / 60)}h ${
      minutesUntilPhase % 60
    }m`
  );
}
