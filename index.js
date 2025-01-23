//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework
require("dotenv").config();
var framework = require("webex-node-bot-framework");
var webhook = require("webex-node-bot-framework/webhook");
var express = require("express");
var bodyParser = require("body-parser");
const fs = require('fs');
const path = require('path');
const csv = require('csv');

const { processQuote } = require('./logic/CNC7/bombot_cnc7.js');
const deviceMapping = require('./logic/CNC7/device-mapping');
const { downloadFile, uploadFile } = require('./logic/R2CCW/file-handler');
const { logAudit, STATUS } = require('./logic/R2CCW/audit.js');

var app = express();
app.use(bodyParser.json());
app.use(express.static("images"));

const config = {
  token: process.env.BOTTOKEN,
};

// Only pass the webhook URL and port if it has been set in the environment
if (process.env.WEBHOOKURL && process.env.PORT) {
  config.webhookUrl = process.env.WEBHOOKURL;
  config.port = process.env.PORT;
}


// init framework
var framework = new framework(config);
framework.start();
console.log("Starting framework, please wait...");

framework.on("initialized", () => {
  console.log("framework is all fired up! [Press CTRL-C to quit]");
});

// A spawn event is generated when the framework finds a space with your bot in it
// If actorId is set, it means that user has just added your bot to a new space
// If not, the framework has discovered your bot in an existing space
framework.on("spawn", (bot, id, actorId) => {
  if (!actorId) {
    // don't say anything here or your bot's spaces will get
    // spammed every time your server is restarted
    console.log(
      `While starting up, the framework found our bot in a space called: ${bot.room.title}`
    );
  } else {
    // When actorId is present it means someone added your bot got added to a new space
    // Lets find out more about them..
    var msg =
      "You can say `help` to get the list of words I am able to respond to.";
    bot.webex.people
      .get(actorId)
      .then((user) => {
        msg = `Hello there ${user.displayName}. ${msg}`;
      })
      .catch((e) => {
        console.error(
          `Failed to lookup user details in framwork.on("spawn"): ${e.message}`
        );
        msg = `Hello there. ${msg}`;
      })
      .finally(() => {
        // Say hello, and tell users what you do!
        if (bot.isDirect) {
          bot.say("markdown", msg);
        } else {
          let botName = bot.person.displayName;
          msg += `\n\nDon't forget, in order for me to see your messages in this group space, be sure to *@mention* ${botName}.`;
          bot.say("markdown", msg);
        }
      });
  }
});

// Implementing a framework.on('log') handler allows you to capture
// events emitted from the framework.  Its a handy way to better understand
// what the framework is doing when first getting started, and a great
// way to troubleshoot issues.
// You may wish to disable this for production apps
framework.on("log", (msg) => {
  console.log(msg);
});

// Process incoming messages
// Each hears() call includes the phrase to match, and the function to call if webex mesages
// to the bot match that phrase.
// An optional 3rd parameter can be a help string used by the frameworks.showHelp message.
// An optional fourth (or 3rd param if no help message is supplied) is an integer that
// specifies priority.   If multiple handlers match they will all be called unless the priority
// was specified, in which case, only the handler(s) with the lowest priority will be called

/* On mention with bot data
ex User enters @botname 'space' phrase, the bot will provide details about that particular space
*/
framework.hears(
  "space",
  (bot) => {
    console.log("space. the final frontier");
    let roomTitle = bot.room.title;
    let spaceID = bot.room.id;
    let roomType = bot.room.type;

    let outputString = `The title of this space: ${roomTitle} \n\n The roomID of this space: ${spaceID} \n\n The type of this space: ${roomType}`;

    console.log(outputString);
    bot
      .say("markdown", outputString)
      .catch((e) => console.error(`bot.say failed: ${e.message}`));
  },
  "**space**: (get details about this space) ",
  0
);

/*
   Say hi to every member in the space
   This demonstrates how developers can access the webex
   sdk to call any Webex API.  API Doc: https://webex.github.io/webex-js-sdk/api/
*/
framework.hears(
  "say hi to everyone",
  (bot) => {
    console.log("say hi to everyone.  Its a party");
    // Use the webex SDK to get the list of users in this space
    bot.webex.memberships
      .list({ roomId: bot.room.id })
      .then((memberships) => {
        for (const member of memberships.items) {
          if (member.personId === bot.person.id) {
            // Skip myself!
            continue;
          }
          let displayName = member.personDisplayName
            ? member.personDisplayName
            : member.personEmail;
          bot.say(`Hello ${displayName}`);
        }
      })
      .catch((e) => {
        console.error(`Call to sdk.memberships.get() failed: ${e.messages}`);
        bot.say("Hello everybody!");
      });
  },
  "**say hi to everyone**: (everyone gets a greeting using a call to the Webex SDK)",
  0
);

/* On mention reply example
ex User enters @botname 'reply' phrase, the bot will post a threaded reply
*/
framework.hears(
  "reply",
  (bot, trigger) => {
    console.log("someone asked for a reply.  We will give them two.");
    bot.reply(
      trigger.message,
      "This is threaded reply sent using the `bot.reply()` method.",
      "markdown"
    );
    var msg_attach = {
      text: "This is also threaded reply with an attachment sent via bot.reply(): ",
      file: "https://media2.giphy.com/media/dTJd5ygpxkzWo/giphy-downsized-medium.gif",
    };
    bot.reply(trigger.message, msg_attach);
  },
  "**reply**: (have bot reply to your message)",
  0
);

/* On mention with command
ex User enters @botname help, the bot will write back in markdown
 *
 * The framework.showHelp method will use the help phrases supplied with the previous
 * framework.hears() commands
*/
framework.hears(
  /help|what can i (do|say)|what (can|do) you do/i,
  (bot, trigger) => {
    console.log(`someone needs help! They asked ${trigger.text}`);
    bot
      .say(`Hello ${trigger.person.displayName}.`)
      .then(() => bot.say("markdown", framework.showHelp()))
      .catch((e) => console.error(`Problem in help handler: ${e.message}`));
  },
  "**help**: (what you are reading now)\n" +
  "**bom**: (paste device list to generate CNC v7.0 BoM, example:\nBOM\n8101-32H,1 8102-64H,2)",
  0
);

// Add BOM handler - matches both "BOM" alone and "BOM" followed by device list
framework.hears(
  /^BOM/im,
  async (bot, trigger) => {
    console.log("\n=== BOM Processing Start ===");
    console.log("Raw input:", trigger.text);
    
    try {
      // Process the raw input directly
      const result = await processQuote(trigger.text);
      console.log("Result from processQuote:", result);
      
      // Send the result back to user
      bot.say('markdown', `Processed BOM Results:\n\`\`\`\n${result}\`\`\``);

    } catch (error) {
      console.error("Error processing BOM:", error);
      bot.say('markdown', 
        `${error.message}\n\n` +
        `Please use format:\n` +
        `\`\`\`\n` +
        `BOM 8101-32H,1 8102-64H,2\n` +
        `\`\`\``
      );
    }
    console.log("=== BOM Processing End ===\n");
  },
  "**bom**: (paste device list to generate CNC v7.0 BoM, example: BOM 8101-32H,1 8102-64H,2)",
  0
);

// Add CCWR2CCW handler
framework.hears(
  /^CCWR2CCW/im,
  async (bot, trigger) => {
    console.log("\n=== CCWR2CCW Processing Start ===");
    console.log("Message:", trigger.message);
    
    const user = trigger.person.emails[0];
    
    try {
      // Check if we have a file
      if (!trigger.message.files || trigger.message.files.length === 0) {
        logAudit(user, 'CCWR2CCW', STATUS.ISSUE, 'No file attached');
        throw new Error('Please attach a CSV file');
      }

      // Get first file
      const fileUrl = trigger.message.files[0];
      console.log("File URL:", fileUrl);
      
      // Download file content using proper token from env
      const fileContent = await downloadFile(fileUrl, process.env.BOTTOKEN, user, bot, trigger.message.roomId);
      console.log("File downloaded");

      // Process the file
      const { processCSVFile } = require('./logic/R2CCW/ccwr2ccw.js');
      const processedResult = await processCSVFile(fileContent, user, trigger.message.files[0].split('/').pop());
      console.log("File processed");

      // Upload processed file
      await uploadFile(bot, trigger.message.roomId, processedResult, user);
      console.log("File uploaded to user");

      // Log successful processing with line count
      logAudit(user, 'CCWR2CCW', STATUS.OK, 'File processed successfully', processedResult.lineCount);

    } catch (error) {
      console.error("Error processing CCWR2CCW:", error);
      logAudit(user, 'CCWR2CCW', STATUS.ERROR, error.message);
      
      bot.say('markdown', 
        `Error: ${error.message}\n\n` +
        `Please attach a CSV file with your request:\n` +
        `\`\`\`\n` +
        `CCWR2CCW\n` +
        `[attach your CSV file]\n` +
        `\`\`\``
      );
    }
    console.log("=== CCWR2CCW Processing End ===\n");
  },
  "**ccwr2ccw**: (attach CSV file to process and get Est12345.csv back)",
  0
);

// Update the catch-all handler
framework.hears(
  /.*/,
  (bot, trigger) => {
    console.log(`catch-all handler fired for user input: ${trigger.text}`);
    bot
      .say(`Sorry, I don't know how to respond to "${trigger.text}"`)
      .then(() => bot.say("markdown", framework.showHelp()))
      .catch((e) =>
        console.error(`Problem in the unexpected command handler: ${e.message}`)
      );
  },
  999999  // Lowest priority
);

//Server config & housekeeping
// Health Check
app.get("/", (req, res) => {
  res.send(`I'm alive.`);
});

app.post("/", webhook(framework));

var server = app.listen(config.port, () => {
  framework.debug("framework listening on port %s", config.port);
});

// gracefully shutdown (ctrl-c)
process.on("SIGINT", () => {
  framework.debug("stopping...");
  server.close();
  framework.stop().then(() => {
    process.exit();
  });
});