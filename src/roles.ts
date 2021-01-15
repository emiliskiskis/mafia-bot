import { ACCEPT_EMOJI, DECLINE_EMOJI, PREFIX, client_id } from ".";
import { Message, Snowflake, TextChannel } from "discord.js";

import { readGameData } from "./data";

const outposts = [
  "Adama",
  "Adria",
  "Ahab",
  "Ahti",
  "Albreed",
  "Archanis",
  "Ausich",
  "Bahat",
  "Benthic",
  "Billante",
  "Boxlighter",
  "Calhamer",
  "Cebu",
  "Champino",
  "Chongos",
  "Clarkrye",
  "Congo",
  "Cousteau",
  "Dakuwaqa",
  "Deepcore",
  "Dejongh",
  "Donatu",
  "El-Farolito",
  "Enki",
  "Fam",
  "Fate",
  "Feld",
  "Gabler",
  "Gandhi",
  "Garfield",
  "Goss",
  "Gotengo.",
  "Hagai",
  "Haik",
  "Hashimoto",
  "Hatoria",
  "Hellman",
  "Hook",
  "Humblerod",
  "Isaksen",
  "Kai-chan",
  "Kanola",
  "Kiesling",
  "King",
  "Kramer",
  "Kyburz",
  "Lir",
  "Magellan",
  "Mandela",
  "Maranga",
  "Mazu",
  "McGuire",
  "Naija",
  "Nautilus",
  "Nemo",
  "Neptune",
  "Oaktown",
  "October",
  "Paricia",
  "Phillips",
  "Poseidon",
  "Poteca",
  "Proteus",
  "Ran",
  "Raven",
  "Roberts",
  "Rokovoko",
  "Ruiz",
  "Sagan",
  "Saltmine",
  "Samet",
  "Seabass",
  "Sedna",
  "Serenity",
  "Shaneville",
  "Shasta",
  "Sivan",
  "Smithrand",
  "Solo",
  "Soren",
  "Ssam-Bar",
  "Stella",
  "Suijin",
  "Suukyi",
  "Tamir",
  "Tangaroa",
  "Thunderbird",
  "Tiberius",
  "Tometz",
  "Triton",
  "Tyrion",
  "Vaccarino",
  "Varuna",
  "Verne",
  "Vintgar",
  "Wallace",
  "Wilkes",
  "Wohlwend",
  "Woodridge",
  "Yamato"
] as const;

enum Faction {
  TOWN,
  MAFIA,
  NEUTRAL
}

export const factions = {
  [Faction.TOWN]: "Town",
  [Faction.MAFIA]: "Mafia",
  [Faction.NEUTRAL]: "Neutral"
};

interface Shot {
  time?: Date;
  outpost: typeof outposts[number];
}

interface Blackmail {
  target: Snowflake;
  endTime: Date;
}

interface Ventriloquy {
  ventriloquist: Snowflake;
  puppet: Snowflake;
  ventriloquistChannel: Snowflake;
  puppetChannel: Snowflake;
  endTime: Date;
}

interface Psychiatry {
  psychiatrist: Snowflake;
  patient: Snowflake;
  endTime: Date;
}

export interface Role {
  title: string;
  faction: Faction;
  action?(...args: any): any;
}

type RoleDistribution = {
  faction: Faction;
  count: number;
}[];

export const roleDistribution: RoleDistribution =
  process.env.NODE_ENV === "production"
    ? [
        { faction: Faction.TOWN, count: 4 },
        { faction: Faction.MAFIA, count: 3 },
        { faction: Faction.NEUTRAL, count: 2 }
      ]
    : [{ faction: Faction.TOWN, count: 1 }];

export const roles: Role[] = [
  { title: "Alchemist", faction: Faction.TOWN },
  { title: "Banker", faction: Faction.TOWN },
  { title: "Bodyguard", faction: Faction.TOWN },
  { title: "Bus Driver", faction: Faction.TOWN },
  { title: "Detective", faction: Faction.TOWN },
  { title: "Doctor", faction: Faction.TOWN },
  { title: "Escort", faction: Faction.TOWN },
  { title: "Investigator", faction: Faction.TOWN, action: doInvestigator },
  { title: "Lookout", faction: Faction.TOWN },
  { title: "Mayor", faction: Faction.TOWN },
  { title: "Psychiatrist", faction: Faction.TOWN },
  { title: "Sheriff", faction: Faction.TOWN },
  { title: "Tracker", faction: Faction.TOWN },
  { title: "Trainee", faction: Faction.TOWN },
  { title: "Veteran", faction: Faction.TOWN },
  { title: "Ambusher", faction: Faction.MAFIA },
  { title: "Bankster", faction: Faction.MAFIA },
  { title: "Blackmailer", faction: Faction.MAFIA, action: doBlackmail },
  { title: "Consigliere", faction: Faction.MAFIA },
  { title: "Framer", faction: Faction.MAFIA },
  { title: "Godfather", faction: Faction.MAFIA },
  { title: "Hitman", faction: Faction.MAFIA },
  { title: "Napalm", faction: Faction.MAFIA },
  { title: "Shapeshifter", faction: Faction.MAFIA },
  { title: "Sniper", faction: Faction.MAFIA },
  { title: "Ventriloquist", faction: Faction.MAFIA, action: doVentriloquist },
  { title: "Amnesiac", faction: Faction.NEUTRAL },
  { title: "Arsonist", faction: Faction.NEUTRAL },
  { title: "Cultist", faction: Faction.NEUTRAL },
  { title: "Cult Leader", faction: Faction.NEUTRAL },
  { title: "Disguiser", faction: Faction.NEUTRAL },
  { title: "Executioner", faction: Faction.NEUTRAL },
  { title: "Grinch", faction: Faction.NEUTRAL },
  { title: "Mime", faction: Faction.NEUTRAL },
  { title: "Negotiator", faction: Faction.NEUTRAL },
  { title: "Out of Towner", faction: Faction.NEUTRAL },
  { title: "Patient Zero", faction: Faction.NEUTRAL },
  { title: "Serial Killer", faction: Faction.NEUTRAL },
  { title: "Truth Seeker", faction: Faction.NEUTRAL },
  { title: "Twin", faction: Faction.NEUTRAL },
  { title: "Vampire", faction: Faction.NEUTRAL },
  { title: "Werewolf", faction: Faction.NEUTRAL },
  { title: "Witch", faction: Faction.NEUTRAL },
  { title: "Witch Doctor", faction: Faction.NEUTRAL }
];

const priorityList = [
  "Amnesiac", // transformation
  "Ambusher ",
  // "Mayor ability steal",
  // Recruits
  "Out of Towner",
  "Godfather",
  "Mayor",
  "Cult",
  "Mayor", // gift request
  "Veteran",
  "Escort",
  "Alchemist",
  "Witch Doctor", // Stab in arm
  "Bus Driver",
  "Witch",
  "Shapeshifter",
  "Doctor",
  "Pharmacist",
  "Psychiatrist",
  "Bodyguard",
  "Mime",
  "Blackmailer",
  "Ventriloquist",
  "Hitman",
  "Electrician",
  // "Grinch/any shooting roles/Witch Doctor (stab in head & chest)"
  "Grinch",
  "/any shooting roles/",
  "Witch Doctor", // (stab in head & chest)
  "Truth Seeker",
  "Framer",
  "Lookout",
  "Investigator",
  "Arsonist",
  "Serial Killer", // request(???)
  "Patient Zero",
  "Werewolf",
  "Vampire",
  "Banker"
];

const investigationResults = [
  {
    result: "Your target likes to bother people a lot...",
    roles: ["Escort", "Witch", "Arsonist", "Blackmailer"]
  },
  {
    result: "Your target likes to work silently...",
    roles: ["Lookout", "Grinch", "Investigator", "Truthseeker", "Hitman"]
  },
  {
    result: "Your target is out for vengeance...",
    roles: ["Sheriff", "Ambusher", "Executioner", "Vampire", "Werewolf"]
  },
  {
    result: "Your target understands people very well...",
    roles: ["Mayor", "Twin", "Consigliere", "Disguiser"]
  },
  {
    result: "Your target follows people around...",
    roles: ["Sniper", "Ventriloquist", "Detective", "Patient Zero"]
  },
  {
    result: "Your target does things you don't understand...",
    roles: ["Amnesiac", "Napalm", "Alchemist", "Framer", "Psychiatrist"]
  },
  {
    result: "Your target is always near others...",
    roles: ["Bodyguard", "Cult Leader", "Negotiator"]
  },
  {
    result: "Your target knows how to get others' attention...",
    roles: ["Godfather", "Cultist", "Doctor", "Veteran"]
  }
];

/*
  The algorithm for the ventriloquist is this:
  1. Create ventriloquist and puppet channels
  2. Set up the bot to repeat ventriloquist channel messages in the puppet channel
  3. After phase ends, delete both channels

  Recovering from errors can be annoying, because one of the channels
    may not create or the bot has to restart during the relaying
  It's important to save this state and load it on startup, however,
    no persistent state has been implemented.
*/
export async function doVentriloquist(msg: Message) {
  const guildId = msg.guild?.id;

  // Check if command is executed in a text channel
  if (!(msg.channel instanceof TextChannel) || !guildId) {
    msg.reply("the command only works in a server text channel.");
    return;
  }
  const parentId = msg.channel?.parentID;

  // Check if text channel is in a channel category
  if (!parentId) {
    msg.reply("the text channel has to be in a channel category.");
    return;
  }

  const data = await readGameData(guildId, parentId);
  const { narratorId } = data;

  // Check if game initiator is the narrator
  if (msg.author.id !== narratorId) {
    await msg.reply("you're not the narrator for this game.");
    return;
  }

  const matches = msg.content.match(/ventriloquist +<@!(\d+)> +<@!(\d+)>$/);
  if (!matches || !msg.guild) {
    return;
  }

  const [ventriloquist, puppet] = matches.slice(1);
  // I hate doing 'let' instead of 'const'
  let ventriloquistChannel: TextChannel, puppetChannel: TextChannel;

  try {
    puppetChannel = await msg.guild.channels.create("puppet-channel", {
      parent: parentId,
      type: "text",
      permissionOverwrites: [
        {
          id: msg.guild.id,
          deny: "VIEW_CHANNEL"
        },
        {
          id: client_id,
          allow: "VIEW_CHANNEL"
        },
        {
          id: narratorId,
          allow: "VIEW_CHANNEL"
        },
        {
          id: puppet,
          allow: "VIEW_CHANNEL",
          deny: "SEND_MESSAGES"
        }
      ]
    });
    // Check if both channels were created
  } catch (e) {
    msg.reply(
      `Error creating puppet channel, create one manually and run command ${PREFIX}setpuppetchannel.`
    );
    Error.captureStackTrace(e);
    console.error(e);
  }

  try {
    ventriloquistChannel = await msg.guild.channels.create(
      "ventriloquist-channel",
      {
        parent: parentId,
        type: "text",
        permissionOverwrites: [
          {
            id: msg.guild.id,
            deny: "VIEW_CHANNEL"
          },
          {
            id: client_id,
            allow: "VIEW_CHANNEL"
          },
          {
            id: narratorId,
            allow: "VIEW_CHANNEL"
          },
          {
            id: ventriloquist,
            allow: "VIEW_CHANNEL"
          }
        ]
      }
    );
  } catch (e) {
    msg.reply(
      `Error creating ventriloquist channel, create one manually and run command ${PREFIX}setventriloquistchannel.`
    );
    Error.captureStackTrace(e);
    console.error(e);
    return; // For ventriloquist channel message collector, doesn't look right though
    // The try/catch block is supposed to recover from an error(?), but now it breaks the rest of the function
  }

  // Relay all messages from ventriloquist channel to puppet channel
  try {
    // Collector is bad, no way to halt this operation
    // In case of errors, we want to maintain the state that this channel has to be relayed to #puppet-channel
    const ventriloquistChannelCollector = ventriloquistChannel.createMessageCollector(
      () => true
    );
    ventriloquistChannelCollector.on("collect", async (msg: Message) => {
      try {
        // I don't want the bot to send two messages. Best if we look into implementing OAuth2 for direct message writing
        // But that approach raises privacy concerns, because I can't specify to be able to write *only* in #town-square
        await puppetChannel.send("---");
        await puppetChannel.send(msg.content);
        // Martin M asked to provide feedback if the bot successfully relayed the message to #puppet-channel
        await msg.react(ACCEPT_EMOJI);
      } catch (e) {
        Error.captureStackTrace(e);
        console.error(e);
        // What's stupid is that the react function might be causing the error and the X react might fail again
        try {
          await msg.react(DECLINE_EMOJI);
        } catch (e) {
          Error.captureStackTrace(e);
          console.error(e);
        }
      }
    });
  } catch (e) {
    Error.captureStackTrace(e);
    console.error(e);
  }
}

export async function doBlackmail(msg: Message) {
  const guildId = msg.guild?.id;

  // Check if command is executed in a text channel
  if (!(msg.channel instanceof TextChannel) || !guildId) {
    msg.reply("the command only works in a server text channel.");
    return;
  }
  const parentId = msg.channel?.parentID;

  // Check if text channel is in a channel category
  if (!parentId) {
    msg.reply("the text channel has to be in a channel category.");
    return;
  }

  const data = await readGameData(guildId, parentId);
  const { narratorId } = data;

  // Check if game initiator is the narrator
  if (msg.author.id !== narratorId) {
    await msg.reply("you're not the narrator for this game.");
    return;
  }

  const matches = msg.content.match(/blackmail +<@!(\d+)>$/);
  if (!matches || !matches[1]) {
    await msg.reply("wrong command syntax.");
    return;
  }

  const townSquareChannel = msg.guild?.channels.cache.get("797526186854187048");

  try {
    await townSquareChannel?.overwritePermissions([
      ...townSquareChannel.permissionOverwrites.values(),
      {
        id: matches[1],
        deny: "SEND_MESSAGES"
      }
    ]);
  } catch (e) {
    await msg.reply("uh oh, fucky wucky!");
    return;
  }
}

export async function doInvestigator(msg: Message) {
  const guildId = msg.guild?.id;

  // Check if command is executed in a text channel
  if (!(msg.channel instanceof TextChannel) || !guildId) {
    msg.reply("the command only works in a server text channel.");
    return;
  }
  const parentId = msg.channel?.parentID;

  // Check if text channel is in a channel category
  if (!parentId) {
    msg.reply("the text channel has to be in a channel category.");
    return;
  }

  const data = await readGameData(guildId, parentId);
  const { narratorId, players } = data;

  // Check if game initiator is the narrator
  if (msg.author.id !== narratorId) {
    await msg.reply("you're not the narrator for this game.");
    return;
  }

  const matches = msg.content.match(/investigate +<@!(\d+)>$/);
  if (!matches || !matches[1]) {
    await msg.reply("wrong command syntax.");
    return;
  }

  if (!players) {
    await msg.reply("player list missing.");
    return;
  }

  const player = players.find(player => player.id === matches[1]);
  if (!player) {
    await msg.reply("user is not in the game.");
    return;
  }

  const investigationResult = investigationResults.find(investigationResult =>
    investigationResult.roles.includes(player.role?.title ?? "")
  );
  if (!investigationResult) {
    await msg.reply("investigation result: WTF is your target");
  } else {
    await msg.reply(`investigation result: ${investigationResult.result}`);
  }
}
