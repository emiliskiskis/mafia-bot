import * as Discord from "discord.js";

import { doBlackmail, doVentriloquist } from "./roles";
import {
  leaveGame,
  listPlayers,
  setNarrator,
  setPhaseTime,
  setSignupChannel,
  signUp,
  startGame
} from "./signups";

import dotenv from "dotenv";
import { listHelp } from "./help";
import { logMessage } from "./util";

dotenv.config();

if (
  !process.env.client_id ||
  !process.env.client_secret ||
  !process.env.client_token
) {
  console.error(".env variables missing");
  process.exit(1);
}

export const client_id = process.env.client_id;
export const client_secret = process.env.client_secret;
export const client_token = process.env.client_token;

// TODO: Move tokens and secrets to configuration file
export const PREFIX = "!";
export const MAX_PLAYERS = process.env.NODE_ENV === "production" ? 9 : 30;
export const ACCEPT_EMOJI = "✅";
export const DECLINE_EMOJI = "❌";

export type Player = Discord.Snowflake;

export interface Commands {
  [key: string]: {
    fn: (msg: Discord.Message) => Promise<any>;
    helpText: string;
  };
}

const commands: Commands = {
  help: {
    fn: msg => listHelp(msg, commands),
    helpText: "show this command list"
  },
  blackmail: {
    fn: doBlackmail,
    helpText: "<recipient> deny permission to send messages in town square"
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
    fn: listPlayers,
    helpText: "list players currently signed up for the upcoming game"
  },
  setnarrator: {
    fn: setNarrator,
    helpText: "[narrator] set narrator for the upcoming game"
  },
  setphasetime: {
    fn: setPhaseTime,
    helpText: "<HH:mm> set phase time in UTC"
  },
  setsignupchannel: {
    fn: setSignupChannel,
    helpText: "set current channel as signup channel"
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

const client = new Discord.Client();

client.on("ready", () => {
  console.log("Bot ready");
});

client.on("message", async msg => {
  if (msg.author.id === client_id) {
    return;
  }

  if (msg.content.charAt(0) !== PREFIX) {
    return;
  }

  // Log message for reference
  logMessage(msg);

  try {
    if (Object.keys(commands).includes(msg.content.slice(1).split(" ")[0])) {
      await commands[msg.content.slice(1).split(" ")[0]].fn(msg);
    } else {
      await msg.reply(
        "no such command, type !commands or !help for list of commands"
      );
    }
  } catch (e) {
    console.error(e);
    Error.captureStackTrace(e);
    await msg.reply(`error executing command, trace: ${e.stack}`);
  }
});

client.login(client_token);
