import SyncReader from "../io/sync-reader.js";
import Filter from "./filter-parse.js";

export function process(inBuffer, bitmapInfo) {
  let outBuffers = [];
  let reader = new SyncReader(inBuffer);
  let filter = new Filter(bitmapInfo, {
    read: reader.read.bind(reader),
    write: function(bufferPart) {
      outBuffers.push(bufferPart);
    },
    complete: function() {},
  });

  filter.start();
  reader.process();

  return Buffer.concat(outBuffers);
}
