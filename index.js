//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework
require("dotenv").config();
var framework = require("webex-node-bot-framework");
var webhook = require("webex-node-bot-framework/webhook");
var express = require("express");
var bodyParser = require("body-parser");
const fs = require('fs');
const path = require('path');
const csv = require('csv');

const { downloadFile, uploadFile } = require('./logic/R2CCW/file-handler');
const { logAudit, STATUS } = require('./logic/shared/audit/audit.js');
const { downloadImage, runOCR } = require('./logic/Any2CCW/ocr-proc.js');

var app = express();
app.use(bodyParser.json());
app.use(express.static("images"));

const config = {
  token: process.env.BOTTOKEN,
  port: process.env.PORT || 5000,
  messageFormat: 'text',
  removeDeviceRegistrationProperties: true
};

// Only pass the webhook URL and port if it has been set in the environment
if (process.env.WEBHOOKURL && process.env.PORT) {
  config.webhookUrl = process.env.WEBHOOKURL;
  config.port = process.env.PORT;
}


// init framework
var framework = new framework(config);
framework.start();

// Run test after framework initialization
framework.on("initialized", () => {
  console.log("framework is all fired up! [Press CTRL-C to quit]");
  
});

// Override showHelp method to remove framework signature
framework.showHelp = function() {
  let helpText = `Currently implemented services:\n\n` +
  `**ccwr2ccw**: \n` +
  `- in CCWR tool, export quote as CSV format; NB. by default it's XLSX format, so you must change it\n` +
  `- type CCWR2CCW and add the CCWR quote in the same msg\n` +
  `- wait for bot to respond with CCW Estimate in Excel format \n` +
  `- in MDM Quote page, use Import Saved Configuration > BOM Upload > Select > Choose File. Validate\n` +
  `- validate all lines with Validate button, or hit Edit/Save to validate manually\n` +
  `- video with Bot demo - https://app.vidcast.io/share/95bd3e28-8da1-4cd9-8a41-b4eab5bca083\n\n` ;

  return helpText;
};

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
  "**help**: (what you are reading now)\n\n"
);



// Add CCWR2CCW 
framework.hears(
  /^CCWR2CCW/im,
  async (bot, trigger) => {
    console.log("\n=== CCWR2CCW Processing Start ===");    
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
      
      // Single audit log entry with quote info
      //logAudit(user, 'CCWR2CCW', STATUS.OK, 'File processed successfully', processedResult.lineCount, processedResult.quoteInfo);

    } catch (error) {
      console.error("Error processing CCWR2CCW:", error);
      //logAudit(user, 'CCWR2CCW', STATUS.ERROR, error.message, 0, {
      //  quoteNumber: '',
      //  quoteCurrency: '',
      //  quotePrice: ''
      //});
      
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
);

// Add ANY2CCW 
framework.hears(
  /^ANY2CCW/im,
  async (bot, trigger) => {
    console.log("\n=== ANY2CCW Processing Start ===");    
    const user = trigger.person.emails[0];    

    try {
      // Check if we have a file
      if (!trigger.message.files || trigger.message.files.length === 0) {
        logAudit(user, 'ANY2CCW', STATUS.ISSUE, 'No file attached');
        throw new Error('Please attach Image file');
      }

      // Get first file URL
      const fileUrl = trigger.message.files[0];
      console.log("Processing file URL:", fileUrl);
      
      // Inform user about processing
      await bot.say({
        roomId: trigger.message.roomId,
        markdown: "🔍 Processing your image, please wait..."
      });

      // Download and process image
      const imgPath = await downloadImage(fileUrl, process.env.BOTTOKEN, user, bot, trigger.message.roomId);
      console.log('Image downloaded to:', imgPath);

      // Run OCR
      const ocrText = await runOCR(imgPath);
      console.log('OCR text extracted:', ocrText.split('\n').length, 'lines');

      // Convert to CSV and then to XLSX
      // replace by Bridge IT - GPT 4o-mini
      const { convertTextToCSV, convertToXLSXOutput } = require('./logic/Any2CCW/ocr-txt2csv.js');      

      const processedResult = convertToXLSXOutput(convertTextToCSV(ocrText));
      console.log('Converted to XLSX format:', processedResult.lineCount, 'lines');

      // Upload result
      await uploadFile(bot, trigger.message.roomId, processedResult, user);
      console.log('File uploaded successfully');

      // Log success
      logAudit(user, 'ANY2CCW', STATUS.OK, 'File processed successfully', processedResult.lineCount);

      await bot.say('markdown', `✅ Processing completed successfully. Processed ${processedResult.lineCount} lines.`);

    } catch (error) {
      console.error("Error processing ANY2CCW:", error);
      
      logAudit(user, 'ANY2CCW', STATUS.ERROR, error.message);
      
      await bot.say('markdown', 
        `❌ Error: ${error.message}\n\n` +
        `Please attach an Image file with your request:\n` +
        `\`\`\`\n` +
        `ANY2CCW\n` +
        `[attach your Image file]\n` +
        `\`\`\``
      );
    }
    console.log("=== ANY2CCW Processing End ===\n");
  }
);


// Update the catch-all handler
framework.hears(
  /.*/,
  (bot, trigger) => {
    console.log(`catch-all handler fired for user input: ${trigger.text} \n\n`);
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