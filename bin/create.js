const fs = require('fs');
const path = require('path');
const {
	done,
	removeConsoleLine,
	confirm,
	createDirectory,
	removeDirectoryContents,
	cloneTemplate,
	createAppName,
	readFile,
	updateKeyValue,
	writeFile,
	launchedFromCmd
} = require('./custFunc.js');
const template = require('./teplates.js');

const cliProcess = require('cli-steps');
const steps = new cliProcess({
	style: 'binary',
	success: '  ',
	fail: 'Fail',
});

const { simpleGit } = require('simple-git');
const git = simpleGit();

async function checkRepo(repositoryUrl) {
	steps.start();
	steps.text = `Repository Check: `.process + repositoryUrl;
	await git.listRemote(['--refs', repositoryUrl]).catch((err) => {// List remote references for the provided repository URL
		steps.failed(`Repository Check: `.error + repositoryUrl)
		// terminal.info(`Please provide a valid Git repository URL of the form 'https://github.com/username/repository.git'`)
		terminal.info(err.message);
		process.exit(1)
	});
	steps.succeed(`Repository Validated:`.success + repositoryUrl);
	process.stdout.write('\u001b[1A\u001b[2K');
}

async function checkDirectory(destinationPath, force) {
	if (!fs.existsSync(destinationPath)) await createDirectory(destinationPath);
	await emptyDirectory(destinationPath, force);
}

async function emptyDirectory(destinationPath, force) {
	if (fs.readdirSync(destinationPath).length && !force) {
		let ans = await confirm('destination is not empty, continue? [y/N] ');
		if (!ans) {
			terminal.warning(`aborting`);
			process.exit(1)
		}
		if (steps.stdin) {
			steps.stdin.destroy();
		}
		removeConsoleLine();
	}
	await removeDirectoryContents(destinationPath)
}

async function createApplication(destinationPath, options) {
	// terminal.title(`======= Creating superexpress application template =======`)

	await cloneTemplate({
		source: 'https://github.com/mahankals/ExpressBooster-app',
		destination: destinationPath,
		title: 'app'
	}).catch((err) => { });
}

async function gitUpdate(options) {
	try {

		if (options.git || options.repo) {
			await initGit();
		}

		if (options.repo) {
			await addRepo(options);
		}
	} catch (e) {
		console.log(e.message);
	}
}

async function initGit() {
	console.log(`   \x1b[33mGit\x1b[0m : initializing`)
	await git.init()
		.add('./*');
	await git.commit("Project initialised")
		.then(() => {
			process.stdout.write('\u001b[1A\u001b[2K');
			console.log(`   \x1b[32mGit\x1b[0m : init`)
		})
		.catch((err) => {
			process.stdout.write('\u001b[1A\u001b[2K');
			console.error(`   \x1b[31mGit\x1b[0m : unable to initialise comment`)
			// terminal.error("Unable to initialise comment")
			terminal.warning(err.message)
			throw new Error();
		});
}

async function addRepo(options) {
	console.log(`   \x1b[33mrepository\x1b[0m : ` + options.repo)

	// Check if the remote 'origin' exists
	await git.getRemotes(true, async (err, remotes) => {
		const originExists = remotes.some(remote => remote.name === 'origin');
		if (originExists) {
			await git.removeRemote('origin')
		}
	});

	await git.addRemote('origin', options.repo)
		.then(() => {
			process.stdout.write('\u001b[1A\u001b[2K');
			console.log(`   \x1b[32mRepository\x1b[0m : ` + options.repo)
		})
		.catch((err) => {
			process.stdout.write('\u001b[1A\u001b[2K');
			console.error(`   \x1b[31mRepository\x1b[0m : ` + err.message)
		});
}

function finish(dir) {
	console.log('\n   ===== Installation Finished =====')
	var prompt = launchedFromCmd() ? '>' : '$'
	if (dir !== '.') {
		console.log()
		console.log('   change directory:')
		console.log('     %s cd %s', prompt, dir)
	}

	console.log()
	console.log('   install dependencies:')
	console.log('     %s npm install', prompt)
	console.log()
	console.log('   run the app:')
	// if (launchedFromCmd()) {
	//   console.log('     %s SET DEBUG=%s:* & npm start', prompt, name)
	// } else {
	//   console.log('     %s DEBUG=%s:* npm start', prompt, name)
	// }
	console.log('     %s npm start', prompt)
	console.log()
	console.log('   debug the app:')
	console.log('     %s npm run dev', prompt)

	console.log()
}

module.exports = async (destinationPath, options) => {
	let templateChoice = [];
	let templateList = [];
	let matchList = [];

	if (options.template) {
		templateChoice = options.template.split(',')
		templateList = await template.getTemplateList();

		matchList = await template.compair(templateChoice, templateList)
	}

	let repositoryUrl = options.repo;
	if (repositoryUrl) {
		await checkRepo(repositoryUrl);
	}
	await checkDirectory(destinationPath, options.force);
	await createApplication(destinationPath, options);


	// change current working directory
	process.chdir(destinationPath);

	if (options.template) {
		await template.addTemplates(matchList, false);
	}

	var appName = createAppName(path.resolve(destinationPath))
	var fileContent = await readFile(path.join('.env.example'));
	var updatedContent = updateKeyValue(fileContent, 'APP_NAME', appName);
	updatedContent = updateKeyValue(updatedContent, 'APP_ENV', 'development');
	await writeFile(path.join('.env'), updatedContent + '\n');

	await gitUpdate(options);
	finish(destinationPath);
}