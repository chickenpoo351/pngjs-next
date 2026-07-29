import fs from "node:fs";
import { test, expect } from "vitest";
import { PNG } from "../lib/png.js";

test("outputs background, created from scratch", async () => {
  const png = new PNG({
    width: 10,
    height: 10,
    filterType: -1,
  });

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const col = (x < (png.width >> 1)) ^ (y < (png.height >> 1))
          ? 0xe5
          : 0xff;
      png.data[idx] = col;
      png.data[idx + 1] = col;
      png.data[idx + 2] = col;
      png.data[idx + 3] = 0xff;
    }
  }

  const output = await new Promise((resolve, reject) => {
    const chunks = [];

    png
      .pack()
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject);
  });  

  const reference = fs.readFileSync(
    new URL("./bg-ref.png", import.meta.url)
  );

  expect(output.equals(reference)).toBe(true);
});