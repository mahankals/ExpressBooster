const { simpleGit } = require('simple-git');
const git = simpleGit();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cliProcess = require('cli-steps');
const process = new cliProcess({
  style: 'binary',
  success: '  ',
  fail: 'Fail',
});

global.colors = require('colors');
colors.setTheme({
  title: ['brightYellow', 'bold'],
  error: 'red',
  success: 'green',
  process: 'magenta',
  info: ['brightCyan']
});

const MODE_0666 = parseInt('0666', 8);
const MODE_0755 = parseInt('0755', 8);

global.terminal = {
  // https://gist.github.com/JBlond/2fea43a3049b38287e5e9cefc87b2124

  error: function (...args) {
    args.forEach((message, index) => {
      console.error(message.error);
    });
  },
  success: function (...args) {
    args.forEach((message, index) => {
      console.log(message.success);
    });
  },
  process: function (...args) {
    args.forEach((message, index) => {
      console.log(message.process);
    });
  },
  info: function (...args) {
    args.forEach((message, index) => {
      console.log(message.info);
    });
  },
  warning: function (...args) {
    args.forEach((message, index) => {
      console.log(message.yellow);
    });
  },
  title: function (...args) {
    let terminalWidth = global.process.stdout.columns;
    console.log()
    // console.log('='.repeat(terminalWidth))
    args.forEach((message, index) => {
      // Calculate the padding on both sides
      const padding = Math.max(0, Math.floor((terminalWidth - message.length) / 2));
      var remainder = padding % 2;

      // Create the padding strings
      const paddingStringLeft = ' '.repeat(padding);
      const paddingStringRight = ' '.repeat(padding - remainder);
      // Create the message with padding on both sides
      const centeredMessage = `${paddingStringLeft} ${message}`;  // ${paddingStringRight}`;
      // console.log(`\x1b[1;42m${centeredMessage}\x1b[0m`);
      console.log(centeredMessage.title);

    });
  }
};

/**
 * Graceful exit for async STDIO
 * @param {Number} code 
 */
function done(code) {
  // flush output for Node.js Windows pipe bug
  // https://github.com/joyent/node/issues/6247 is just one bug example
  // https://github.com/visionmedia/mocha/issues/333 has a good discussion
  function finish() {
    if (!(draining--)) global.process.exit(code);
  }

  var draining = 0;
  var streams = [process.stdout, process.stderr];

  this.exited = true;

  streams.forEach(function (stream) {
    if (stream) {
      // Check if the stream is defined before trying to write
      draining += 1;
      stream.write('', finish);
    }
  });

  finish();
  process.exit(code);
}

/**
 * return step information
 * 
 * @param {string} title 
 * @param {string} msg 
 */
function stepmsg(title, msg) {
  return `   ${title}` + (msg ? ` : ` + msg.charAt(0).toUpperCase() + msg.slice(1) : '');
}

/**
 * Prompt for confirmation on STDOUT/STDIN
 */
async function confirm(msg) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(msg, function (input) {
      rl.close();
      resolve(/^y|yes|ok|true$/i.test(input));
    });
  });
};

/**
 * Remove console log line
 * 
 * @param {number} n 
 */
function removeConsoleLine(n = 1) {
  for (let i = 0; i < n; i++) {
    process.stdout.write('\u001b[1A\u001b[2K'); // Move up one line and clear it
  }
}

/**
 * Remove Directory Contents recursively
 * 
 * @param {string} directoryPath 
 */
async function removeDirectoryContents(directoryPath) {
  if (!fs.existsSync(directoryPath)) return true;

  // Get the list of files and subdirectories in the directory
  const items = fs.readdirSync(directoryPath);

  // Loop through each item in the directory
  for (const item of items) {
    const itemPath = path.join(directoryPath, item);

    // Check if the item is a file or a directory
    const isFile = fs.statSync(itemPath).isFile();

    // If it's a file, unlink (delete) it
    if (isFile) {
      fs.unlinkSync(itemPath);
    } else {
      // If it's a directory, recursively remove its contents
      fs.rmSync(itemPath, { recursive: true, force: true });
    }
  }
}

/**
 * clone git template
 * 
 * @param {string} remoteRepo 
 * @param {string} destinationPath 
 * @param {string} title 
 * @returns 
 */
async function cloneTemplate(templates) {
  let { source, destination, title = 'base' } = templates;

  process.start();
  process.text = `Downloading Template : `.process + title.charAt(0).toUpperCase() + title.slice(1);
  // return console.log(templates, source, destination, title);
  return new Promise(async (resolve, reject) => {
    // console.log(`Downloading Template : `.process + title.charAt(0).toUpperCase() + title.slice(1))

    await git.clone(source, destination, { '--depth': '1' })
      .then(async () => {
        // fse.removeSync(`${destination}/.git`);
        fs.rmSync(`${destination}/.git`, { recursive: true, force: true })
        process.succeed(`Template : `.success + title.charAt(0).toUpperCase() + title.slice(1)) +
          // console.log(`   Template : `.success + title.charAt(0).toUpperCase() + title.slice(1)) +
          resolve();
      })
      .catch((error) => {
        process.failed(`Template: `.error + title.charAt(0).toUpperCase() + title.slice(1))
        // console.log(`   Template: `.error + title.charAt(0).toUpperCase() + title.slice(1))
        terminal.error(error.message);
        reject(error);
      });
  });
}

/**
 * readfile.
 *
 * @param {String} file
 * @param {String} str
 */

async function readFile(file) {
  return fs.readFileSync(file, "utf-8");
}

/**
 * create file.
 *
 * @param {String} file
 * @param {String} str
 */

async function writeFile(file, str, log = true) {
  fs.writeFileSync(file, str, { mode: MODE_0666 })
  // if (log) console.log('   \x1b[32mCreate\x1b[0m : ' + file)
}

/**
 * Copy file from template directory.
 * 
 * @param {string} from 
 * @param {string} to 
 */
async function copyFile(from, to, log = true) {
  const content = fs.readFileSync(from, 'utf-8');
  writeFile(to, content, log)
}

/**
 * Create an app name from a directory path, fitting npm naming requirements.
 *
 * @param {String} pathName
 */
function createAppName(pathName) {
  return path.basename(pathName)
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Insert hyphen before capital letters
    .replace(/[^A-Za-z0-9.-]+/g, '-') // Replace non-alphanumeric characters
    .replace(/^[-_.]+|-+$/g, '') // Trim leading/trailing hyphens, underscores, and dots
    .toLowerCase();
}

/**
 * Update key value in file
 * 
 * @param {any} content 
 * @param {string} key 
 * @param {any} newValue 
 */
function updateKeyValue(content, key, newValue) {
  const lines = content.split('\n');
  const updatedLines = lines.map((line) => {
    const [lineKey, lineValue] = line.split('=');
    if (lineKey.trim() === key.trim()) return `${key}=${newValue}`;
    return line;
  });
  return updatedLines.join('\n');
}

/**
 * Determine if launched from cmd.exe
 */
function launchedFromCmd() {
  return process.platform === 'win32' &&
    process.env._ === undefined
}

/**
 * check key exist into json file
 * 
 * @param {string} filePath 
 * @param {string} keyToCheck 
 */
async function jsonKeyExist(filePath, keyToCheck) {
  try {
    // Read the JSON file
    const data = await readFile(filePath);

    // Parse the JSON data into a JavaScript object
    const jsonObject = JSON.parse(data);

    // Check if the key exists in the object
    return keyToCheck in jsonObject;
  } catch (parseError) {
    terminal.error(`Error reading or parsing JSON: ${parseError}`);
    done(1)
  }
}

/**
 * Create Express application framework
 * 
 * @param {string} destinationPath 
 */
async function createDirectory(destinationPath) {
  fs.mkdirSync(destinationPath, { recursive: true, mode: MODE_0755 });
}

/**
 * Copy multiple templates
 * 
 * @param {object} templates 
 */
async function cloneMultipleTemplates(templates) {
  try {
    for (const { source, destination, title } of templates) {
      if (!fs.existsSync(destination)) createDirectory(destination);
      await cloneTemplate({
        source: source,
        destination: destination,
        title: title
      });
    }
  } catch (error) {
    // terminal.error('Error cloning templates:', error.response.statusText);
    // console.log()
    // terminal.error(error)
    done(1)
  }
}

async function updateJsonFile(filePath, key, value) {
  try {
    // if(! await jsonKeyExist(filePath, key)) {
    // 	terminal.error(`'${key}' not found in ${filePath}`);
    // 	done(1)
    // }

    // Read the JSON file
    const data = await readFile(filePath);

    // Parse the JSON data into a JavaScript object
    const jsonObject = JSON.parse(data);
    jsonObject[key] = value;
    await writeFile(filePath, JSON.stringify(jsonObject, null, 2), false);
  } catch (parseError) {
    terminal.error(parseError);
    done(1)
  }
}

module.exports = {
  done,
  stepmsg,
  confirm,
  removeConsoleLine,
  removeDirectoryContents,
  cloneTemplate,
  readFile,
  writeFile,
  copyFile,
  createAppName,
  updateKeyValue,
  launchedFromCmd,
  jsonKeyExist,
  createDirectory,
  cloneMultipleTemplates,
  updateJsonFile
}