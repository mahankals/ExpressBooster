[app-icon]: resources/icon.svg

[npm-image]: https://img.shields.io/npm/v/ExpressBooster.svg
[npm-url]: https://npmjs.org/package/ExpressBooster

[downloads-image]: https://img.shields.io/npm/dm/ExpressBooster.svg
[downloads-url]: https://npmjs.org/package/ExpressBooster

[github-actions-ci-image]: https://img.shields.io/github/workflow/status/expressjs/generator/ci/master?label=linux
[github-actions-ci-url]: https://github.com/expressjs/generator/actions/workflows/ci.yml

[appveyor-image]: https://img.shields.io/appveyor/ci/dougwilson/generator/master.svg?label=windows
[appveyor-url]: https://ci.appveyor.com/project/dougwilson/generator

[npm-install-size-image]: https://badgen.net/packagephobia/install/ExpressBooster
[npm-install-size-url]: https://packagephobia.com/result?p=ExpressBooster

<!-- <center>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" 
viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="2" width="20" height="20" rx="2.5" ry="2.5"/>
  <text x="50%" y="50%" font-size="13" text-anchor="middle" dy=".3em" fill="none" stroke-width="2">EB</text>
</svg> -->

<!-- <svg xmlns="http://www.w3.org/2000/svg" width="500" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
  <text x="50%" y="50%" font-size="13" text-anchor="middle" dy=".3em" fill="none" stroke-width="1">ExpressBooster</text>
</svg>
</center> -->

<div style="padding: 10px; text-align: center;">
<img src="resources/icon.svg" alt="App Icon" width="100" height="100"><img style="filter: white;" src="resources/title.svg" alt="App Title" height="100">
</div>

# Rapid Express Application Framework
<!--
  <div style="width:10%; color:red; background-color:gray;">
    <svg xmlns="http://www.w3.org/2000/svg" width="auto" height="auto" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.5" ry="2.5" />
      <text x="50%" y="50%" font-size="13" text-anchor="middle" dy=".3em" fill="none" stroke-width="2">EB</text>
    </svg>
  </div>
  <div style="width:10%; color:red; background-color:gray;">
    <svg xmlns="http://www.w3.org/2000/svg" width="auto" height="auto" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" />
      <text x="50%" y="50%" font-size="13" text-anchor="middle" dy=".3em" fill="none" stroke-width="2">EB</text>
    </svg>
  </div>
-->

ExpressBooster is a powerful Node.js framework designed to supercharge your Express application development. With a single command, ExpressBooster not only generates a fully-fledged Express application structure but also provides a comprehensive framework enriched with command-line capabilities. Tailor your project effortlessly by integrating additional plugins to meet your specific requirements.

## Key Features:

- 🚀 *Express at the Speed of Light:* Instantly generate and follow a comprehensive Express application structure.
- 💻 *Command-Line Magic:* Seamlessly manage your project through an intuitive command-line interface.
- 🧩 *Plugin Friendly:* Customize your project by effortlessly adding plugins for extended functionalities.
- 📦 *Well-Organized Structure:* Follows best practices to keep your codebase clean and maintainable.
- 🌐 *Node.js Ecosystem:* Leverage the power of Node.js for a high-performance backend.

ExpressBooster simplifies the initial setup and provides a robust framework, allowing you to focus on building exceptional web applications. Whether you're a seasoned developer or just starting, ExpressBooster accelerates your Express journey.

Get started with ExpressBooster now and transform your Express development experience!

## Installation

```sh
$ npm install -g git+https://github.com/mahankals/ExpressBooster.git
```

## Quick Start

The quickest way to create express web application is to utilize the executable `ExpressBooster` with bellow command:

```bash
$ expressbooster create myApp && cd myApp
```

Install dependencies:

```bash
$ npm install
```

Start your Express app

```bash
$ npm start
```

Browse your app at [http://localhost:3000/](http://localhost:3000/)

## Command Line Arguments

This appliation configured with the following command line flags.

    $ expressbooster -h
    Usage: expressbooster [options] [command]

    Effortless Express: A Rapid Application Server with Seamless Template Integration

    Options:
      -V, --version                 output the version number
      -h, --help                    display help for command

    Commands:
      create [options] <directory>  create express application with basic template
      template:show                 show list of available templates
      template:add <templates>      add templates from available list
      help [command]                display help for command

    $ expressbooster create -h
    Usage: expressbooster create [options] <directory>

    create express application with basic template

    Arguments:
      directory                        directory name

    Options:
      -g, --git                        init git and initial commit
      -r, --repo <repository url>      add existing git repository to push code
      -t, --template <templates_name>  comma (,) seperated template names
      -f, --force                      force on non-empty directory
      -h, --help                       display help for command