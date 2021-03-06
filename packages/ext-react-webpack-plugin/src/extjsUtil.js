"use strict"

export function getValidateOptions() {
  return {
    "type": "object",
    "properties": {
      "framework":   {"type": [ "string" ]},
      "port":        {"type": [ "integer" ]},
      "emit":        {"type": [ "boolean" ]},
      "browser":     {"type": [ "boolean" ]},
      "profile":     {"type": [ "string" ]},
      "environment": {"type": [ "string" ]},
      "verbose":     {"type": [ "string" ]}
    },
    "additionalProperties": false
    // "errorMessage": {
    //   "option": "should be {Boolean} (https:/github.com/org/repo#anchor)"
    // }
  }
}

export function getDefaultOptions() {
  return {
    port: 1962,
    emit: true,
    browser: true,
    profile: 'desktop', 
    environment: 'development', 
    verbose: 'no'
  }
}

export function getDefaultVars() {
  return {
    firstTime : true,
    browserCount : 0,
    cwd: process.cwd(),
    extPath: '.',
    pluginErrors: [],
    lastNumFiles: 0,
    lastMilliseconds: 0,
    lastMillisecondsAppJson: 0,
    files: ['./app.json'],
    dirs: ['./app','./packages']
  }
}

export function _afterCompile(compilation, vars, options) {
  const logv = require('./pluginUtil').logv
  logv(options,'FUNCTION ext-after-compile')
  const path = require('path')
  let { files, dirs } = vars
  const { cwd } = vars
  files = typeof files === 'string' ? [files] : files
  dirs = typeof dirs === 'string' ? [dirs] : dirs
  const {
    fileDependencies,
    contextDependencies,
  } = _getFileAndContextDeps(compilation, files, dirs, cwd);
  if (files.length > 0) {
    fileDependencies.forEach((file) => {
      compilation.fileDependencies.add(path.resolve(file));
    })
  }
  if (dirs.length > 0) {
    contextDependencies.forEach((context) => {
      compilation.contextDependencies.add(context);
    })
  }
}

function _getFileAndContextDeps(compilation, files, dirs, cwd) {
  //const log = require('./pluginUtil').log
  const uniq = require('lodash.uniq')
  const isGlob = require('is-glob')

  const { fileDependencies, contextDependencies } = compilation;
  const isWebpack4 = compilation.hooks;
  let fds = isWebpack4 ? [...fileDependencies] : fileDependencies;
  let cds = isWebpack4 ? [...contextDependencies] : contextDependencies;
  if (files.length > 0) {
    files.forEach((pattern) => {
      let f = pattern
      if (isGlob(pattern)) {
        f = glob.sync(pattern, { cwd, dot: true, absolute: true })
      }
      fds = fds.concat(f)
    })
    fds = uniq(fds)
  }
  if (dirs.length > 0) {
    cds = uniq(cds.concat(dirs))
  }
  return { fileDependencies: fds, contextDependencies: cds }
}

export function _prepareForBuild(app, vars, options, output, compilation) {
  const log = require('./pluginUtil').log
  const logv = require('./pluginUtil').logv
  logv(options,'_prepareForBuild')
  const fs = require('fs')
  const recursiveReadSync = require('recursive-readdir-sync')
  var watchedFiles=[]
  try {watchedFiles = recursiveReadSync('./app').concat(recursiveReadSync('./packages'))}
  catch(err) {if(err.errno === 34){console.log('Path does not exist');} else {throw err;}}
  var currentNumFiles = watchedFiles.length
  logv(options,'watchedFiles: ' + currentNumFiles)
  var doBuild = false
  for (var file in watchedFiles) {
    if (vars.lastMilliseconds < fs.statSync(watchedFiles[file]).mtimeMs) {
      if (watchedFiles[file].indexOf("scss") != -1) {doBuild=true;break;}
    }
  }
  if (vars.lastMilliseconds < fs.statSync('./app.json').mtimeMs) {
    doBuild=true
  }
  logv(options,'doBuild: ' + doBuild)

  vars.lastMilliseconds = (new Date).getTime()
  var filesource = 'this file enables client reload'
  compilation.assets[currentNumFiles + 'FilesUnderAppFolder.md'] = {
    source: function() {return filesource},
    size: function() {return filesource.length}
  }

  //if(options.verbose == 'yes') {log('-v-' + app + 'currentNumFiles: ' + currentNumFiles)}
  //if(options.verbose == 'yes') {log('-v-' + app + 'vars.lastNumFiles: ' + vars.lastNumFiles)}
  //if(options.verbose == 'yes') {log('-v-' + app + 'doBuild: ' + doBuild)}

  if (currentNumFiles != vars.lastNumFiles || doBuild) {
    vars.rebuild = true
    log(app + 'building Ext bundle at: ' + output.replace(process.cwd(), ''))
  }
  else {
    vars.rebuild = false
  }
  vars.lastNumFiles = currentNumFiles
}
