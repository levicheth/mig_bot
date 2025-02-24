//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework
require("dotenv").config();
var framework = require("webex-node-bot-framework");
var webhook = require("webex-node-bot-framework/webhook");
var express = require("express");
var bodyParser = require("body-parser");
const fs = require('fs');
const path = require('path');
const csv = require('csv');

const { downloadFile, uploadFile, downloadImage } = require('./logic/shared/utils/file-handler.js');
const { logAudit, STATUS } = require('./logic/shared/audit/audit.js');

const { wflowCCWR2CCW } = require('./logic/R2CCW/ccwr2ccw.js');
const { wflowAny2CCW } = require('./logic/Any2CCW/any2ccw.js');
const { wflowCNC7Quoter } = require('./logic/CNC7/cnc7quoter.js');

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
  `- export CCWR quote, convert to MDM Quote format\n` +
  `- demo: https://app.vidcast.io/share/95bd3e28-8da1-4cd9-8a41-b4eab5bca083\n\n` 

  // `- in CCWR tool, export quote as CSV format; NB. by default it's XLSX format, so you must change it\n` +
  // `- type CCWR2CCW and add the CCWR quote in the same msg\n` +
  // `- wait for bot to respond with CCW Estimate in Excel format \n` +
  // `- in MDM Quote page, use Import Saved Configuration > BOM Upload > Select > Choose File. Validate\n` +
  // `- validate all lines with Validate button, or hit Edit/Save to validate manually\n` +
  // `- video with Bot demo - https://app.vidcast.io/share/95bd3e28-8da1-4cd9-8a41-b4eab5bca083\n\n` 
  
  +
  `**cnc7**: cnc7 cisco | vendor_name | 9901 | <CSV file>\n` +
  `- find Cisco/3rd part devices type for CNC 7.0 quote, or generate CNC 7.0 estimate based on CSV file with device types\n` +
  `- demo: https://app.vidcast.io/share/f4aa609f-8988-4291-a248-d988b6b90023\n\n` ;

  // `- this functions automatically generate CCW Estimate based on the nesessary inputs\n` +
  // `- type CNC and add the CSV file with the device types and quantities in the same msg\n` +
  // `- wait for bot to respond with CCW Estimate of CNC v7.0 estimate in Excel format \n` +
  // `- in MDM Quote page, use Import Saved Configuration > BOM Upload > Select > Choose File. Validate\n` +
  // `- validate all lines with Validate button, or hit Edit/Save to validate manually\n` +
  // `- video with Bot demo - https://app.vidcast.io/share/95bd3e28-8da1-4cd9-8a41-b4eab5bca083\n\n` ;

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
  }  
);

// Add CCWR2CCW 
framework.hears(
  /^CCWR/im,
  async (bot, trigger) => {
    console.log("\n=== CCWR2CCW Processing Start ===");    
    const user = trigger.person.emails[0];

    try {
      if (!trigger.message.files || trigger.message.files.length === 0) {
        logAudit(user, 'CCWR2CCW', STATUS.ISSUE, 'No file attached');
        throw new Error('Please attach a CSV file');
      }

      const fileUrl = trigger.message.files[0];    
      console.log("File downloaded");
      
      // Download file content using proper token from env
      console.log("File URL:", fileUrl);
      const fileContent = await downloadFile(fileUrl, process.env.BOTTOKEN, user, bot, trigger.message.roomId);

      // Process the file
      const processedResult = await wflowCCWR2CCW(fileContent, user, trigger.message.files[0].split('/').pop());
      console.log("File processed");

      // Upload processed file
      await uploadFile(bot, trigger.message.roomId, processedResult, user);
      
    } catch (error) {
      console.error("Error processing CCWR2CCW:", error);      
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

// Add CNC7Quoter 
framework.hears(
  /^CNC7/im,
  async (bot, trigger) => {
    console.log("\n=== CNC7QUOTER Processing Start ===");    
    const user = trigger.person.emails[0];

    try {
      // Check if this is a device lookup request
      const message = trigger.message.text.trim();
      if (!trigger.message.files) {
        // Extract search term (everything after CNC7)
        const searchTerm = message.replace(/^CNC7\s*/i, '').trim();
        
        if (!searchTerm) {
          throw new Error('Please provide a device/vendor name to search or attach a CSV file');
        }

        // Perform device lookup
        const { findDevice } = require('./logic/CNC7/devMapCNC7Optim.js');
        const result = findDevice(searchTerm);
        
        await bot.say({
          roomId: trigger.message.roomId,
          markdown: result
        });
        
        return;
      }

      // Original file processing logic
      const fileUrl = trigger.message.files[0];    
      console.log("File downloaded");
      
      // Download file content using proper token from env
      console.log("File URL:", fileUrl);
      const fileContent = await downloadFile(fileUrl, process.env.BOTTOKEN, user, bot, trigger.message.roomId);

      // Process the file
      const result = await wflowCNC7Quoter(fileContent, user, trigger.message.files[0].split('/').pop());
      console.log("File processed");

      // Send the processed file
      await uploadFile(bot, trigger.message.roomId, result, user);

      // Send the mapping details
      if (result.comments) {
        await bot.say({
          roomId: trigger.message.roomId,
          markdown: result.comments
        });
      }
      
    } catch (error) {
      console.error("Error processing CNC7:", error);      
      bot.say('markdown', 
        `Error: ${error.message}\n\n` +
        `Usage:\n` +
        `1. Device/Vendor lookup:\n` +
        `\`\`\`\n` +
        `CNC7 <device/vendor name>\n` +
        `Example: CNC7 7750\n` +
        `Example: CNC7 ciena\n` +
        `\`\`\`\n\n` +
        `2. Process BOM file:\n` +
        `\`\`\`\n` +
        `CNC7\n` +
        `[attach your CSV file]\n` +
        `\`\`\``
      );
    }
    console.log("=== CNC7QUOTER Processing End ===\n");
  },  
);

// Add ANY2CCW 
framework.hears(
  /^ANY2CCW/im,
  async (bot, trigger) => {
    const user = trigger.person.emails[0];    

    try {
      if (!trigger.message.files || trigger.message.files.length === 0) {
        logAudit(user, 'ANY2CCW', STATUS.ISSUE, 'No file attached');
        throw new Error('Please attach Image file');
      }

      const fileUrl = trigger.message.files[0];
      console.log("Processing file URL:", fileUrl); 

      await bot.say({
        roomId: trigger.message.roomId,
        markdown: "🔍 Processing your image, please wait..."
      });

      // Download and process image
      const imgPath = await downloadImage(fileUrl, process.env.BOTTOKEN, user, bot, trigger.message.roomId);
      console.log('Image downloaded to:', imgPath);

      const processedResult = await wflowAny2CCW(imgPath, user, trigger.message.files[0].split('/').pop());
      console.log('File processed');

      /*
      // Run OCR


      const ocrText = await runOCR(imgPath);
      console.log('OCR text extracted:', ocrText.split('\n').length, 'lines');

      // Convert to CSV and then to XLSX
      // replace by Bridge IT - GPT 4o-mini

      const ocrTextToCSV = convertTextToCSV(ocrText);

      const ocrCSVtoMemRecords = await convertCSV2Obj(ocrTextToCSV);

      const records = normalize2EstimateFormat(ocrCSVtoMemRecords);

      const processedResult = convertToXLSXOutput(records);
      console.log('Converted to XLSX format:', processedResult.lineCount, 'lines');

      */

      await uploadFile(bot, trigger.message.roomId, processedResult, user);
      console.log('File uploaded successfully');
      
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