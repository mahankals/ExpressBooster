const path = require('path');
const fs = require('fs');
const { jsonKeyExist, createDirectory, updateJsonFile, cloneMultipleTemplates, readFile, writeFile, done } = require('./custFunc.js');

async function getTemplateList() {
  const username = 'mahankals';
  const prefix = 'ExpressBooster-';
  const excludedRepoNames = ['ExpressBooster-app'];
  const apiUrl = `https://api.github.com/users/${username}/repos`;

  try {
    const response = await fetch(apiUrl);
    const repos = await response.json();

    const superexpressRepos = await repos
      .filter(repo => repo.name.startsWith(prefix) && !excludedRepoNames.includes(repo.name))
      .map(repo => ({
        name: repo.name.substring(prefix.length),
        desc: repo.description ?? '',
        url: repo.html_url,
      }));
    return superexpressRepos;
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    terminal.error("Unable to fetch templates. Please try again later.")
    done(1);
    return [];
  }
}

async function showTemplates(list) {
  list = list ?? await getTemplateList();
  const result = list.map((obj, index) => `${index + 1}) ${obj.name}: ${obj.desc}`).join('\n');
  if (!result.length) {
    terminal.info("Templates comming soon! Be connected for exciting updates.")
    done(0);
  }
  console.info('Available templates are:')
  console.log(result);
}

async function compair(list, templateList) {
  templateList = templateList ?? await getTemplateList();
  const unmatchList = list.filter(item => !templateList.some(template => template.name === item));
  const matchList = templateList.filter(item => list.some(template => template === item.name));

  if (unmatchList.length) {
    console.error(`\x1b[31mUnmatch Templates\x1b[0m: `, unmatchList.join(', '));
    await showTemplates(templateList);
    done(1);
  }
  return matchList;
}

async function addTemplates(matchList, showMsg = true) {
  if (showMsg) terminal.title("", "Install Templates", "");

  let pkgFile = path.join(process.cwd(), 'package.json');
  let isExist = await jsonKeyExist(pkgFile, 'workspaces');
  let wPath = path.join(process.cwd(), 'apps');

  if (!isExist) {
    if (!fs.existsSync(wPath)) await createDirectory(wPath);
    await updateJsonFile(pkgFile, 'workspaces', ['apps/*']);
  }

  const templates = matchList.map(template => ({
    source: template.url,
    destination: path.join(process.cwd(), 'apps', template.name),
    title: template.name
  }));

  try {
    await cloneMultipleTemplates(templates);
  } catch (error) {
    terminal.error(error)
    done(1)
  }

  try {
    // add templates into app.js
    let appPath = path.join('index.js');
    let data = await readFile(appPath);

    const searchImport = "const app = require('express')()";
    const searchUse = 'server.use(app)';

    for (const obj of matchList) {
      const importStatement = `const ${obj.name}App = require('./apps/${obj.name}/index.js');`;
      const useStatement = `server.use(${obj.name}App);`;

      // Check if import statement already exists
      if (!data.includes(importStatement)) {
        const importPosition = data.indexOf(searchImport) + searchImport.length + 1;

        // Insert the new import statement
        data = data.slice(0, importPosition) + `\n${importStatement}` + data.slice(importPosition);
      }

      // Check if app.use statement already exists
      if (!data.includes(useStatement)) {
        const middlewarePosition = data.indexOf(searchUse) + searchUse.length + 1;

        // Insert the new middleware registration
        data = data.slice(0, middlewarePosition) + `\n${useStatement}` + data.slice(middlewarePosition);
      }
    }

    const hasImportAndUse = data.indexOf(searchImport) >= 0 && data.indexOf(searchUse) >= 0;

    // Ensure that the import and middleware registration exist
    if (!hasImportAndUse) {
      throw new Error();
    }

    await writeFile(appPath, data, false);

    if (showMsg) {
      console.log();
      terminal.info(`    Templates downloaded successfully.`);
      console.log(`    install template dependencies with 'npm install' before start.`);
    };
  } catch (err) {
    console.log(err)
    terminal.error(`       Failed to add import statements or middleware registrations'`)
    console.log()

    if (showMsg) {
      let uses = templates.map(obj => `app.use(require('apps/${obj.title}'));`).join('\n');
      console.log(`    Templates downloaded successfully. Now you can use it into your app like middleware.
    e.g.
      const app = express();

      ${uses}
      `);
    }
  }
}

module.exports = {
  getTemplateList,
  showTemplates,
  compair,
  addTemplates,
}