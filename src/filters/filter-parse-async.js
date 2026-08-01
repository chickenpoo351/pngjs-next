import util from "node:util";
import ChunkStream from "../io/chunkstream.js";
import Filter from "./filter-parse.js";

function FilterAsync(bitmapInfo) { // this codebase is so weird... nonetheless I am going to come back and fix all of this weird stuff up but for now we just need to get this into ESM :p
  ChunkStream.call(this);

  let buffers = [];
  let that = this;
  this._filter = new Filter(bitmapInfo, {
    read: this.read.bind(this),
    write: function(buffer) {
      buffers.push(buffer);
    },
    complete: function() {
      that.emit("complete", Buffer.concat(buffers));
    },
  });

  this._filter.start();
}
util.inherits(FilterAsync, ChunkStream);

export default FilterAsync;
