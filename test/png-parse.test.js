import fs from "node:fs";
import Stream from "node:stream";
import { expect, test } from "vitest";
import { PNG } from "../lib/png.js";

function parseFile(filename) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(new URL(`./png-parse-data/${filename}`, import.meta.url))
      .pipe(new PNG())
      .once("error", reject)
      .once("parsed", function () {
        resolve(this);
      });
  });
}

function parseBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const bufferStream = new Stream.PassThrough();
    bufferStream.end(buffer);

    bufferStream
      .pipe(new PNG())
      .once("error", reject)
      .once("parsed", function () { // was this a typo? it was set to "parse" instead of "parsed" which for whatever reason worked...
        resolve(this);
      });
  });
}

function getPixel(png, x, y) {
  return png.data.readUInt32BE((x + y * png.width) * 4);
}

test("should correctly parse a 1-bit colormap png", async () => {
  const png = await parseFile("1bit.png");

  expect(png.width).toBe(1024);
  expect(png.height).toBe(1024);
  expect(png.data.length).toBe(1024 * 1024 * 4);

  let isOk = true;

  for (let y = 1023; y >= 0 && isOk; y--) {
    for (let x = 1023; x >= 0; x--) {
      if (getPixel(png, x, y) !== 0x000000ff) {
        isOk = false;
        break;
      }
    }
  }

  expect(isOk).toBe(true);
});

test("should correctly parse an 8-bit grayscale png", async () => {
  const png = await parseFile("grayscale.png");

  expect(png.width).toBe(16);
  expect(png.height).toBe(16);
  expect(png.data.length).toBe(16 * 16 * 4);

  for (let y = 15; y >= 0; y--) {
    for (let x = 15; x >= 0; x--) {
      expect(getPixel(png, x, y)).toBe((x ^ y) * 286331136 + 255);
    }
  }
});

test("should correctly parse an 8-bit truecolor png", async () => {
  const png = await parseFile("truecolor.png");

  expect(png.width).toBe(16);
  expect(png.height).toBe(16);
  //expect(png.bpp).toBe(3);
  expect(png.data.length).toBe(16 * 16 * 4);

  for (let y = 15; y >= 0; y--) {
    for (let x = 15; x >= 0; x--) {
      expect(getPixel(png, x, y)).toBe(
        x * 285212672 + y * 1114112 + (x ^ y) * 4352 + 255
      );
    }
  }
});

test("should correctly parse an 8-bit truecolor png with alpha", async () => {
  const png = await parseFile("truecoloralpha.png")
  expect(png.width).toBe(16);
  expect(png.height).toBe(16);
  //t.equal(png.bpp, 4);
  expect(png.data.length).toBe(16 * 16 * 4);
  //t.equal(png.trailer.length, 0);

  for (let y = 15; y >= 0; y--) {
    for (let x = 15; x >= 0; x--) {
      expect(getPixel(png, x, y)).toBe(
        x * 285212672 + y * 1114112 + (x ^ y) * 17
      );
    }
  }
});

test("should correctly read image with scanline filter", async () => {
  const png = await parseFile("accum.png");

  expect(png.width).toBe(1024);
  expect(png.height).toBe(1024);
  //expect(png.bpp).toBe(3);
  expect(png.data.length).toBe(1024 * 1024 * 4);
  //expect(png.trailer.length).toBe(0);

  expect(getPixel(png, 0, 0)).toBe(0xff0000ff);
  expect(getPixel(png, 1, 0)).toBe(0xff0000ff);
  expect(getPixel(png, 420, 308)).toBe(0xff0029ff);
  expect(getPixel(png, 433, 308)).toBe(0x0a299dff);
  expect(getPixel(png, 513, 308)).toBe(0x0066ffff);
  expect(getPixel(png, 728, 552)).toBe(0xff0047ff);
});

test("should correctly read an indexed color image", async () => {
  const png = await parseFile("indexed.png");

  expect(png.width).toBe(16);
  expect(png.height).toBe(16);
  //expect(png.bpp).toBe(3);
  expect(png.data.length).toBe(16 * 16 * 4);
  //expect(png.trailer.length).toBe(0);

  for (let y = 15; y >= 0; y--) {
    for (let x = 15; x >= 0; x--) {
      let expected;
      if (x + y < 8) {
        expected = 0xff0000ff;
      } else if (x + y < 16) {
        expected = 0x00ff00ff;
      } else if (x + y < 24) {
        expected = 0x0000ffff;
      } else {
        expected = 0x000000ff;
      }
      expect(getPixel(png, x, y)).toBe(expected);
    }
  }
});

test("should correctly read an indexed color image with alpha", async () => {
  const png = await parseFile("indexedalpha.png");

  expect(png.width).toBe(16);
  expect(png.height).toBe(16);
  //expect(png.bpp).toBe(4);
  expect(png.data.length).toBe(16 * 16 * 4);
  //expect(png.trailer.length).toBe(0);

  for (let y = 15; y >= 0; y--) {
    for (let x = 15; x >= 0; x--) {
      let expected;
      if (x >= 4 && x < 12) {
        expected = 0x00000000;
      } else if (x + y < 8) {
        expected = 0xff0000ff;
      } else if (x + y < 16) {
        expected = 0x00ff00ff;
      } else if (x + y < 24) {
        expected = 0x0000ffff;
      } else {
        expected = 0x000000ff;
      }
      expect(getPixel(png, x, y)).toBe(expected);
    }
  }
});

test("should correctly support crazily-filtered images", async () => {
  const png = await parseFile("paeth.png")
  expect(png.width).toBe(512);
  expect(png.height).toBe(512);
  //expect(png.bpp).toBe(4);
  expect(png.data.length).toBe(512 * 512 * 4);

  expect(getPixel(png, 0, 0)).toBe(0xff000000);
  expect(getPixel(png, 1, 0)).toBe(0xff000000);
  expect(getPixel(png, 0, 1)).toBe(0xff000000);
  expect(getPixel(png, 2, 2)).toBe(0xff000000);
  expect(getPixel(png, 0, 50)).toBe(0xff000000);
  expect(getPixel(png, 219, 248)).toBe(0xff000d00);
  expect(getPixel(png, 220, 248)).toBe(0xff000d00);
  expect(getPixel(png, 215, 249)).toBe(0xff000c00);
  expect(getPixel(png, 216, 249)).toBe(0xff000c00);
  expect(getPixel(png, 217, 249)).toBe(0xff000d00);
  expect(getPixel(png, 218, 249)).toBe(0xff000d00);
  expect(getPixel(png, 219, 249)).toBe(0xff000e00);
  expect(getPixel(png, 220, 249)).toBe(0xff000e00);
  expect(getPixel(png, 263, 319)).toBe(0xff002100);
  expect(getPixel(png, 145, 318)).toBe(0x05535a00);
  expect(getPixel(png, 395, 286)).toBe(0x0007ff00);
  expect(getPixel(png, 152, 167)).toBe(0x052c3500);
  expect(getPixel(png, 153, 167)).toBe(0x04303600);
  expect(getPixel(png, 154, 167)).toBe(0x042f3700);
  expect(getPixel(png, 100, 168)).toBe(0xff000400);
  expect(getPixel(png, 120, 168)).toBe(0xff000900);
  expect(getPixel(png, 140, 168)).toBe(0xff001b00);
  expect(getPixel(png, 150, 168)).toBe(0x05313600);
  expect(getPixel(png, 152, 168)).toBe(0x04343c00);
  expect(getPixel(png, 153, 168)).toBe(0x03343f00);
  expect(getPixel(png, 154, 168)).toBe(0x03344100);
  expect(getPixel(png, 155, 168)).toBe(0x02344300);
  expect(getPixel(png, 156, 168)).toBe(0x02314400);
  expect(getPixel(png, 157, 168)).toBe(0x02323f00);
  expect(getPixel(png, 158, 168)).toBe(0x03313900);
});

test("should bail with an error given an invalid PNG", async () => {
  const buf = Buffer.from("I AM NOT ACTUALLY A PNG", "utf8");

  await expect(parseBuffer(buf)).rejects.toBeInstanceOf(Error);
});

test("should bail with an error given an empty file", async () => {
  const buf = Buffer.from("");

  await expect(parseBuffer(buf)).rejects.toBeInstanceOf(Error);
});

test("should bail with an error given a bad chunk type", async () => {
  await expect(parseFile("with_bad_type.png")).rejects.toBeInstanceOf(Error);
});

test("should bail with an error given a truncated PNG", async () => {
  const buf = Buffer.from("89504e470d0a1a0a000000", "hex");

  await expect(parseBuffer(buf)).rejects.toBeInstanceOf(Error);
});

test("should return an error if a PNG is normal except for a missing IEND", async () => {
  const buf = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000100000001008000000003a98a0bd000000017352474200aece1ce90000002174455874536f6674776172650047726170686963436f6e7665727465722028496e74656c297787fa190000008849444154789c448e4111c020100363010b58c00216b080052c60010b58c0c259c00216ae4d3b69df99dd0d1062caa5b63ee6b27d1c012996dceae86b6ef38398106acb65ae3e8edbbef780564b5e73743fdb409e1ef2f4803c3de4e901797ac8d3f3f0f490a7077ffffd03f5f507eaeb0fd4d71fa8af3f505f7fa0befe7c7dfdb9000000ffff0300c0fd7f8179301408",
    "hex"
  );

  await expect(parseBuffer(buf)).rejects.toBeInstanceOf(Error);
});

test("should set alpha=true in metadata for images with tRNS chunk", async () => {
  const metadata = await new Promise((resolve, reject) => {
    fs.createReadStream(new URL(`./in/tbbn0g04.png`, import.meta.url))
      .pipe(new PNG())
      .once("metadata", resolve)
      .once("error", reject);
  });

  expect(metadata.alpha).toBe(true);
});

test("should parse with low highWaterMark", async () => {
  await expect(
    new Promise((resolve, reject) => {
      fs.createReadStream(new URL(`./in/tbbn0g04.png`, import.meta.url), {
        highWaterMark: 2,
      })
        .pipe(new PNG())
        .once("parsed", resolve)
        .once("error", reject);
    })
  ).resolves.toBeDefined();
});
