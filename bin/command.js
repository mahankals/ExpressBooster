#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const createApp = require('./create.js');
const template = require('./teplates.js');

const pkgFile = path.join(__dirname, "../package.json")
const data = fs.readFileSync(pkgFile, "utf-8");
const pkg = JSON.parse(data);

program
	.name(pkg.name)
	.version(pkg.version)
	.description(pkg.description);

program
	.command('create')
	.description('create express application with basic template')
	.argument('<directory>', 'directory name')
	.option('-g, --git', 'init git and initial commit')
	.option('-r, --repo <repository url>', 'add existing git repository to push code')
	.option('-t, --template <templates_name>', 'comma (,) seperated template names')
	.option('-f, --force', 'force on non-empty directory')
	.action(async function (destinationPath, options) {
		createApp(destinationPath, options);
	});

program
	.command('template:show')
	.description('show list of available templates')
	.action(async function () {
		template.showTemplates();
	});

program
	.command('template:add')
	.description('add templates from available list')
	.argument('<templates>', 'comma (,) seperated template names')
	.action(async function (templ) {
		let templateChoice = templ.split(',')
		let templateList = await template.getTemplateList();
		let matchList = await template.compair(templateChoice, templateList)
		await template.addTemplates(matchList);
	});

// Handle the command
program.parse(process.argv);