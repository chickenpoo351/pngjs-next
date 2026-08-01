import { parse } from "./decode/parser-sync.js";
import { pack } from "./encode/packer-sync.js";

export function read(buffer, options) {
  return parse(buffer, options || {});
}

export function write(png, options) {
  return pack(png, options);
}
