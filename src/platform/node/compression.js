// I know it looks silly but if I am thinking this through correctly then... in theory
// this should work... er well not exactly this obviously this would work it's just a
// rename of functions lol

import zlib from "node:zlib";

const ZCreateInflate = zlib.createInflate;
const ZCreateDeflate = zlib.createDeflate;
const ZInflateSync = zlib.inflateSync;
const ZDeflateSync = zlib.deflateSync;
const ZInflate = zlib.Inflate;
const Z_MIN_CHUNK = zlib.Z_MIN_CHUNK;
const Z_FINISH = zlib.Z_FINISH;

export { Z_FINISH, Z_MIN_CHUNK, ZCreateDeflate, ZCreateInflate, ZDeflateSync, ZInflate, ZInflateSync };
