import * as Discord from "discord.js";

import {
  GameData,
  GuildData,
  readGameData,
  readGuildData,
  saveGameData,
  saveGuildData
} from "./data";
import { Role, doBlackmail, doInvestigator, doVentriloquist } from "./roles";
import {
  leaveGame,
  listPlayers,
  setNarrator,
  setNarratorRole,
  setPhaseTime,
  setSignupChannel,
  signUp,
  startGame
} from "./signups";

import dotenv from "dotenv";
import { listHelp } from "./help";
import { logMessage } from "./util";

type Dict<T> = {
  [key: string]: T | undefined;
};
type EnvVars = Dict<string> &
  {
    [key in typeof requiredEnvVars[number]]?: string;
  };

dotenv.config();

const requiredEnvVars = [
  "client_id",
  "client_secret",
  "client_token",
  "test_guild_id"
] as const;
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`${envVar} missing from environment variables`);
  }
});

function areRequiredEnvVarsPresent(
  envVars: Dict<string>
): envVars is Required<EnvVars> {
  return !requiredEnvVars.some(envVar => !envVars[envVar]);
}

if (!areRequiredEnvVarsPresent(process.env)) {
  process.exit(1);
}

export const client_id = process.env.client_id;
export const client_secret = process.env.client_secret;
export const client_token = process.env.client_token;
export const test_guild_id = process.env.test_guild_id;

export const PREFIX = process.env.NODE_ENV === "production" ? "mafia " : ".";
export const MAX_PLAYERS = process.env.NODE_ENV === "production" ? 9 : 1;
export const ACCEPT_EMOJI = "✅";
export const DECLINE_EMOJI = "❌";

export type SaveDataFn<T extends {}> = (data: T) => Promise<void>;

export type Player = {
  id: Discord.Snowflake;
  role?: Role;
};

export interface Commands<T extends any[]> {
  [key: string]: {
    fn: (...args: T) => Promise<void>;
    helpText: string;
  };
}

const basicCommands: Commands<[Discord.Message]> = {
  help: {
    fn: listHelp,
    helpText: "show this command list"
  }
};

const guildCommands: Commands<
  [Discord.Message, GuildData, SaveDataFn<GuildData>]
> = {
  setnarratorrole: {
    fn: setNarratorRole,
    helpText: "<role> set role as narrator eligible role"
  }
};

const gameCommands: Commands<
  [Discord.Message, GameData, SaveDataFn<GameData>]
> = {
  blackmail: {
    fn: doBlackmail,
    helpText: "<recipient> deny permission to send messages in town square"
  },
  investigate: {
    fn: doInvestigator,
    helpText: "<target> investigate player"
  },
  join: {
    fn: signUp,
    helpText: "sign up for the upcoming game"
  },
  leave: {
    fn: leaveGame,
    helpText: "leave the upcoming game"
  },
  playerlist: {
    fn: (msg, data) => listPlayers(msg, data),
    helpText: "list players currently signed up for the upcoming game"
  },
  setphasetime: {
    fn: setPhaseTime,
    helpText: "<HH:mm> set phase time in UTC"
  },
  start: {
    fn: startGame,
    helpText: "start the game"
  },
  ventriloquist: {
    fn: doVentriloquist,
    helpText:
      "<ventriloquist> <puppet> creates a ventriloquist conversation thing"
  }
};

const mixedCommands: Commands<
  [
    Discord.Message,
    GuildData,
    GameData,
    SaveDataFn<GuildData>,
    SaveDataFn<GameData>
  ]
> = {
  setnarrator: {
    fn: setNarrator,
    helpText: "[narrator] set narrator for the upcoming game"
  },
  setsignupchannel: {
    fn: setSignupChannel,
    helpText: "set current channel as signup channel"
  }
};

export const commands = {
  ...basicCommands,
  ...guildCommands,
  ...gameCommands,
  ...mixedCommands
};

const basicCommandNames = Object.keys(basicCommands);
const guildCommandNames = Object.keys(guildCommands);
const gameCommandNames = Object.keys(gameCommands);
const mixedCommandNames = Object.keys(mixedCommands);
const commandNames = [
  ...basicCommandNames,
  ...guildCommandNames,
  ...gameCommandNames,
  ...mixedCommandNames
];

const client = new Discord.Client();

client.on("ready", () => {
  console.log("Bot ready");
});

client.on("message", async msg => {
  // Ignore command if message sent was by the bot
  if (msg.author.id === client_id) {
    return;
  }

  // Ignore command if didn't start with prefix
  if (!msg.content.startsWith(PREFIX)) {
    return;
  }

  // Ignore command if running in production and bot has been DM'd
  if (
    process.env.NODE_ENV === "production" &&
    msg.channel instanceof Discord.DMChannel
  ) {
    return;
  }

  // Ignore command if environment and guild don't match up
  // (dev runs in test guild, prod runs elsewhere)
  if (
    msg.channel instanceof Discord.TextChannel &&
    (process.env.NODE_ENV === "development") !==
      (msg.guild?.id === test_guild_id)
  ) {
    return;
  }

  // Log message for reference
  logMessage(msg);
  const commandName = msg.content.slice(PREFIX.length).split(" ")[0];

  try {
    if (commandNames.includes(commandName)) {
      // Check if the command is a basic command
      if (basicCommandNames.includes(commandName)) {
        await basicCommands[commandName].fn(msg);
        return;
      }

      // Check if the command is a server command
      else if (guildCommandNames.includes(commandName)) {
        const guild = msg.guild;
        if (!(msg.channel instanceof Discord.TextChannel) || !guild) {
          msg.reply("the command only works in a server text channel.");
          return;
        }

        await guildCommands[commandName].fn(
          msg,
          await readGuildData(guild.id),
          data => saveGuildData(guild.id, data)
        );
        return;
      }

      // Check if the command is a game command
      else if (gameCommandNames.includes(commandName)) {
        const guild = msg.guild;
        if (!(msg.channel instanceof Discord.TextChannel) || !guild) {
          msg.reply("the command only works in a server text channel.");
          return;
        }

        const parent = msg.channel.parent;
        if (!parent) {
          msg.reply("the text channel has to be in a channel category.");
          return;
        }

        await gameCommands[commandName].fn(
          msg,
          await readGameData(guild.id, parent.id),
          data => saveGameData(guild.id, parent.id, data)
        );
        return;
      }

      // Check if the command is a mixed command
      else if (mixedCommandNames.includes(commandName)) {
        const guild = msg.guild;
        if (!(msg.channel instanceof Discord.TextChannel) || !guild) {
          msg.reply("the command only works in a server text channel.");
          return;
        }

        const parent = msg.channel.parent;
        if (!parent) {
          msg.reply("the text channel has to be in a channel category.");
          return;
        }

        await mixedCommands[commandName].fn(
          msg,
          await readGuildData(guild.id),
          await readGameData(guild.id, parent.id),
          data => saveGuildData(guild.id, data),
          data => saveGameData(guild.id, parent.id, data)
        );
        return;
      }
    } else {
      await msg.reply(
        "no such command, type !commands or !help for list of commands"
      );
    }
  } catch (e) {
    Error.captureStackTrace(e);
    console.error(e);
    await msg.reply(`error executing command, trace: ${e.stack}`);
  }
});

client.login(client_token);
