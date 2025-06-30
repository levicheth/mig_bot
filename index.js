//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework
require("dotenv").config();
var framework = require("webex-node-bot-framework");
var webhook = require("webex-node-bot-framework/webhook");
var express = require("express");
var bodyParser = require("body-parser");
const fs = require('fs');
const path = require('path');
const csv = require('csv');

const { downloadFile, uploadFile } = require('./logic/shared/utils/file-handler.js');
const { logAudit, STATUS } = require('./logic/shared/audit/audit.js');

const { wflowCCWR2CCW } = require('./logic/R2CCW/ccwr2ccw.js');
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
      await uploadFile(bot, trigger.message.roomId, processedResult, user, null, "CCWR2CCW");
      logAudit(user, 'CCWR2CCW', STATUS.OK, 'File processed OK', processedResult.lineCount, processedResult.quoteInfo);
      
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

// Add MbrVsbChk 
framework.hears(
  /^mbr/im,
  async (bot, trigger) => {
    console.log("\n=== Mbr Processing Start ===");    
    const user = trigger.person.emails[0];
    try {
      if (!trigger.message.files || trigger.message.files.length === 0) {
        logAudit(user, 'Mbr', STATUS.ISSUE, 'No file attached');
        throw new Error('Please attach a CSV file');
      }

      // (a) Save input files to local fs
      const fileUrls = trigger.message.files;
      console.log('[Mbr] Input file URLs:', fileUrls);
      
      // Download all files
      const fileContents = [];
      const fileNames = [];
      for (const fileUrl of fileUrls) {
        const fileContent = await downloadFile(fileUrl, process.env.BOTTOKEN, user, bot, trigger.message.roomId);
        fileContents.push(fileContent);
        fileNames.push(fileUrl.split('/').pop() || 'unknown.csv');
      }
      
      // Save to data directory
      const dataDir = path.join(__dirname, 'data');
      const inputPaths = [];
      for (let i = 0; i < fileContents.length; i++) {
        const randomName = `file_${Date.now()}_${Math.floor(Math.random()*10000)}.xlsx`;
        const filePath = path.join(dataDir, randomName);
        fs.writeFileSync(filePath, fileContents[i]);
        inputPaths.push(filePath);
      }
      console.log('[Mbr] Local file paths:', inputPaths);

      // (b) Process files with FastAPI - using downloaded files
      console.log('[Mbr] Input files found:', inputPaths);
      
      const axios = require('axios');
      const apiUrl = process.env.MBR_VSB_API_URL || 'http://127.0.0.1:3333/mbr-vsb-chk-fs';
      console.log('[Mbr] Calling FastAPI endpoint:', apiUrl);
      const response = await axios.post(apiUrl, { filepaths: inputPaths });
      const outputFile = response.data.output_file;
      const sumMissing = response.data.sum_missing;
      const countMissing = response.data.count_missing;
      console.log('[Mbr] Output file from FastAPI:', outputFile);

      let analysisMessage = `Analysis complete.`;
      if (sumMissing !== undefined && countMissing !== undefined) {
        analysisMessage += `\n\n---\n` +
                           `**Sum of Missing VSB Bookings:** $${sumMissing.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                           `**Count of Missing VSB Deals:** ${countMissing}`;
      }
      await bot.say('markdown', analysisMessage);

      // (c) Read output file and send to user
      if (outputFile && fs.existsSync(outputFile)) {
        const outputBuffer = fs.readFileSync(outputFile);
        
        // Convert CSV to Excel
        const XLSX = require('xlsx');
        const csvContent = outputBuffer.toString('utf8');
        const workbook = XLSX.read(csvContent, { type: 'string' });
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        await uploadFile(bot, trigger.message.roomId, {
          buffer: excelBuffer,
          filename: 'output.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }, user, null, "MbrVsbChk");
        logAudit(user, 'MbrVsbChk', STATUS.OK, 'Output file sent to user.');
        console.log('[Mbr] Output file sent to user.');
      } else {
        throw new Error('Output file not found on server.');
      }
    } catch (error) {
      // Check for specific error from the API about missing MBR file
      if (error.response && error.response.data && error.response.data.error === 'MBR file not detected') {
        bot.say('markdown', `**Error:** MBR file not detected. Please make sure to include a valid MBR report.`);
      } else {
        // Handle all other errors generically
        console.error('Error in Mbr handler:', error);
        bot.say('markdown', `An unexpected error occurred: ${error.message || 'Please check the logs.'}`);
      }
    }
    console.log('=== MbrVsbChk Processing End ===\n');
  }
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
