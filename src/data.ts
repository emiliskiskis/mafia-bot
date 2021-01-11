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

export async function readGameData(guildId: Snowflake, parentId: Snowflake) {
  const channelPath = path.join("data", guildId, parentId);
  const filePath = path.join(channelPath, "data.json");

  // Ensure that file exists, make a new one if it doesn't exist
  if (!fs.existsSync(channelPath)) {
    await fsPromises.mkdir(channelPath, { recursive: true });
  }
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
  const channelPath = path.join("data", guildId, parentId);
  const filePath = path.join(channelPath, "data.json");

  // Ensure that directory exists, make a new one if it doesn't exist
  if (!fs.existsSync(channelPath)) {
    await fsPromises.mkdir(channelPath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf-8" });
}
