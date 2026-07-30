// so for some reason this file fails a single test if you run simply `pnpm vitest`
// as for why? my theory is it is a parallelism thing with vite running all the tests at once
// something is happening... not sure exactly what but setting the vite config to use 1
// worker seems to fix it? (granted now that means tests will run a bit slower...)

import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { PNG } from "../lib/png.js";

const inDir = new URL("./in/", import.meta.url);
const outDir = new URL("./out/", import.meta.url);
const outSyncDir = new URL("./outsync/", import.meta.url);

const files = (await fs.promises.readdir(inDir)).filter((file) => file.endsWith(".png"));

console.log("Converting images");

describe("image conversion", () => {
  for (const file of files) {
    const expectedError = file.startsWith("x");
    test(`convert sync - ${file}`, async () => {
      const data = await fs.promises.readFile(new URL(file, inDir));
      let png;

      try {
        png = PNG.sync.read(data);
      } catch (err) {
        if (expectedError) {
          return;
        }
        throw err;
      }
      expect(expectedError).toBe(false);

      const outpng = new PNG();
      outpng.gamma = png.gamma;
      outpng.data = png.data;
      outpng.width = png.width;
      outpng.height = png.height;

      await new Promise((resolve, reject) => {
        outpng
          .pack()
          .pipe(fs.createWriteStream(new URL(file, outSyncDir)))
          .on("finish", resolve)
          .on("error", reject);
      });
    }, 1000 * 6 * 5);
    test(`convert async - ${file}`, async () => {
      await new Promise((resolve, reject) => {
        fs.createReadStream(new URL(file, inDir))
          .pipe(new PNG())
          .on("error", (err) => {
            if (expectedError) {
              resolve();
            } else {
              reject(err);
            }
          })
          .on("parsed", function() {
            if (expectedError) {
              reject(new Error(`Async: Error expected, parsed fine - ${file}`));
              return;
            }
            this.pack()
              .pipe(fs.createWriteStream(new URL(file, outDir)))
              .on("finish", resolve)
              .on("error", reject);
          });
      });
    }, 1000 * 60 * 5);
  }
});
