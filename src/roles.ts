import { Collection, Message, TextChannel } from "discord.js";
import { PREFIX, client_id, narratorId } from ".";

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
    puppetChannel = await msg.guild.channels.create("puppet-chat", {
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
    console.error(e.stack);
  }

  try {
    ventriloquistChannel = await msg.guild.channels.create(
      "ventriloquist-chat",
      {
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
        throw Error("Intentional error");
        // Martin M asked to provide feedback if the bot successfully relayed the message to #puppet-channel
        await msg.react("✅");
      } catch (e) {
        Error.captureStackTrace(e);
        console.error(e.stack);
        // What's stupid is that the react function might be causing the error and the X react might fail again
        try {
          await msg.react("❌");
        } catch (e) {
          Error.captureStackTrace(e);
          console.error(e.stack);
        }
      }
    });
  } catch (e) {
    Error.captureStackTrace(e);
    console.error(e.stack);
  }
}

export async function doBlackmail(msg: Message) {
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
