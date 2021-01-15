import { Player } from ".";
import { Snowflake } from "discord.js";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

export interface GameData {
  narratorId?: Snowflake;
  phaseTime?: string;
  players?: Player[];
  signupChannelId?: Snowflake;
}

export interface GuildData {
  narratorRoleId?: Snowflake;
}

export async function getGuildDataFilePath(guildId: Snowflake) {
  const folderPath = path.join("data", "guilds", guildId);
  const filePath = path.join(folderPath, "guild.json");

  // Ensure that file exists, make a new one if it doesn't exist
  if (!fs.existsSync(filePath)) {
    await fsPromises.mkdir(folderPath, { recursive: true });
  }

  return filePath;
}

export async function getGameDataFilePath(
  guildId: Snowflake,
  gameId: Snowflake
) {
  const folderPath = path.join("data", "guilds", guildId, "games");
  const filePath = path.join(folderPath, `${gameId}.json`);

  // Ensure that file exists, make a new one if it doesn't exist
  if (!fs.existsSync(filePath)) {
    await fsPromises.mkdir(folderPath, { recursive: true });
  }

  return filePath;
}

export async function readGuildData(guildId: Snowflake) {
  const filePath = await getGuildDataFilePath(guildId);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "{}", { encoding: "utf-8" });
  }

  return JSON.parse(
    await fsPromises.readFile(filePath, { encoding: "utf-8" })
  ) as GuildData;
}

export async function saveGuildData(guildId: Snowflake, data: GuildData) {
  const filePath = await getGuildDataFilePath(guildId);

  fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf-8" });
}

export async function readGameData(guildId: Snowflake, parentId: Snowflake) {
  const filePath = await getGameDataFilePath(guildId, parentId);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "{}", { encoding: "utf-8" });
  }

  return JSON.parse(
    await fsPromises.readFile(filePath, { encoding: "utf-8" })
  ) as GameData;
}

export async function saveGameData(
  guildId: Snowflake,
  parentId: Snowflake,
  data: GameData
) {
  const filePath = await getGameDataFilePath(guildId, parentId);

  fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf-8" });
}
