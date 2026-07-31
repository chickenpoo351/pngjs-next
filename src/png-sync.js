"use strict";

let parse = require("./decode/parser-sync");
let pack = require("./encode/packer-sync");

exports.read = function(buffer, options) {
  return parse(buffer, options || {});
};

exports.write = function(png, options) {
  return pack(png, options);
};
