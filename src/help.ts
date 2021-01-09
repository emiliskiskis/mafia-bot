import { Commands, PREFIX } from ".";

import { Message } from "discord.js";

export async function listHelp(msg: Message, commands: Commands) {
  await msg.channel.send(`\
>>> Commands (<> are required parameters, [] are optional parameters):

${Object.entries(commands)
  .sort((a1, a2) => (a1[0] > a2[0] ? 1 : a1[0] < a2[0] ? -1 : 0))
  .map(([key, { helpText }]) => `${PREFIX}${key} - ${helpText}`)
  .join("\n")}`);
}
