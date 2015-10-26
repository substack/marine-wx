#!/usr/bin/env node

var os = require('os')
var mkdirp = require('mkdirp')
var path = require('path')
var fs = require('fs')
var strftime = require('strftime')
var hyperquest = require('hyperquest')

var loc = 'sf north'
var wxurls = require('./urls.json')
var wxurl = wxurls[loc]

var cachedir = path.join(os.homedir(), '.cache', 'marine-wx')
mkdirp.sync(cachedir)

var times = 0

fs.readdir(cachedir, function (err, files) {
  var file = files.filter(function (file) {
    return /^\d{4}-\d{2}-\d{2}_\d{2}.\d{2}.\d{2}$/
  }).sort()[0]
  if (!file) fetch(read)
  else read(null, path.join(cachedir, file))

  function read (err, file) {
    fs.readFile(file, 'utf8', function (err, src) {
      if (err) return error(err)
      var lines = src.split('\n')
      var m = /^Expires:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(lines[0])
      if (!m) return fetch(read)
      var expire = new Date(m[1], m[2]-1, m[3], m[4], m[5])
      if (Date.now() > expire.getTime()) return fetch(read)
      show(file)
    })
  }
})

function show (file) {
  fs.readFile(file, 'utf8', function (err, src) {
    if (err) return error(err)
    var sections = src.replace(/\r/g, '').split('\n\n')
    console.log(sections.slice(3).join('\n\n').trim())
  })
}

function fetch (cb) {
  if (times++ > 1) {
    return error('failed to fetch weather report')
  }
  var hq = hyperquest(wxurl)
  var file = path.join(cachedir, strftime('%F_%H.%M.%S'))
  var w = fs.createWriteStream(file)
  hq.once('error', cb)
  w.once('finish', function () { cb(null, file) })
  hq.pipe(w)
}

function error (err) {
  console.error(err.message || err)
  process.exit(1)
}
