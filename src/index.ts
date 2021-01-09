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

import { listHelp } from "./help";
import { logMessage } from "./util";

// TODO: Move tokens and secrets to configuration file
export const client_id = "796138204762865695";
const client_secret = "lKWa8XGA3Sy2mhTlcWq8xA3WxYy3JS80";
const client_token =
  "Nzk2MTM4MjA0NzYyODY1Njk1.X_Tjew.d6gfUZteOqU8kiWvDnT8YvP5wKE";
export const PREFIX = "!";
export const MAX_PLAYERS = process.env.NODE_ENV === "production" ? 9 : 5;
export const ACCEPT_EMOJI = "✅";
export const DECLINE_EMOJI = "❌";

export type Player = string;
export let narratorId: string | null = null;
const players: Player[] = [];

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
    fn: msg => signUp(msg, players),
    helpText: "sign up for the upcoming game"
  },
  leave: {
    fn: msg => leaveGame(msg, players),
    helpText: "leave the upcoming game"
  },
  playerlist: {
    fn: msg => listPlayers(msg, players),
    helpText: "list players currently signed up for the upcoming game"
  },
  setnarrator: {
    fn: msg =>
      setNarrator(msg, narratorId, id => {
        narratorId = id;
      }),
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
    fn: msg => startGame(msg, narratorId, players),
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
