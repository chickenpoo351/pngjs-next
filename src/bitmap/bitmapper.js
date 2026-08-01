import { getImagePasses, getInterlaceIterator } from "./interlace.js";

const pixelBppMapper = [
  // 0 - dummy entry
  () => {},

  // 1 - L
  // 0: 0, 1: 0, 2: 0, 3: 0xff
  (pxData, data, pxPos, rawPos) => {
    if (rawPos === data.length) {
      throw new Error("Ran out of data");
    }

    const pixel = data[rawPos];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = 0xff;
  },

  // 2 - LA
  // 0: 0, 1: 0, 2: 0, 3: 1
  (pxData, data, pxPos, rawPos) => {
    if (rawPos + 1 >= data.length) {
      throw new Error("Ran out of data");
    }

    const pixel = data[rawPos];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = data[rawPos + 1];
  },

  // 3 - RGB
  // 0: 0, 1: 1, 2: 2, 3: 0xff
  (pxData, data, pxPos, rawPos) => {
    if (rawPos + 2 >= data.length) {
      throw new Error("Ran out of data");
    }

    pxData[pxPos] = data[rawPos];
    pxData[pxPos + 1] = data[rawPos + 1];
    pxData[pxPos + 2] = data[rawPos + 2];
    pxData[pxPos + 3] = 0xff;
  },

  // 4 - RGBA
  // 0: 0, 1: 1, 2: 2, 3: 3
  (pxData, data, pxPos, rawPos) => {
    if (rawPos + 3 >= data.length) {
      throw new Error("Ran out of data");
    }

    pxData[pxPos] = data[rawPos];
    pxData[pxPos + 1] = data[rawPos + 1];
    pxData[pxPos + 2] = data[rawPos + 2];
    pxData[pxPos + 3] = data[rawPos + 3];
  },
];

const pixelBppCustomMapper = [
  // 0 - dummy entry
  () => {},

  // 1 - L
  // 0: 0, 1: 0, 2: 0, 3: 0xff
  (pxData, pixelData, pxPos, maxBit) => {
    const pixel = pixelData[0];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = maxBit;
  },

  // 2 - LA
  // 0: 0, 1: 0, 2: 0, 3: 1
  (pxData, pixelData, pxPos) => {
    const pixel = pixelData[0];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = pixelData[1];
  },

  // 3 - RGB
  // 0: 0, 1: 1, 2: 2, 3: 0xff
  (pxData, pixelData, pxPos, maxBit) => {
    pxData[pxPos] = pixelData[0];
    pxData[pxPos + 1] = pixelData[1];
    pxData[pxPos + 2] = pixelData[2];
    pxData[pxPos + 3] = maxBit;
  },

  // 4 - RGBA
  // 0: 0, 1: 1, 2: 2, 3: 3
  (pxData, pixelData, pxPos) => {
    pxData[pxPos] = pixelData[0];
    pxData[pxPos + 1] = pixelData[1];
    pxData[pxPos + 2] = pixelData[2];
    pxData[pxPos + 3] = pixelData[3];
  },
];

class BitReader {
  #data;
  #depth;
  #leftover = [];
  #index = 0;

  constructor(data, depth) {
    this.#data = data;
    this.#depth = depth;
  }

  #split() {
    if (this.#index === this.#data.length) {
      throw new Error("Ran out of data");
    }
    const byte = this.#data[this.#index++];
    switch (this.#depth) {
      default: {
        throw new Error("unrecognised depth");
      }
      case 16: {
        if (this.#index === this.#data.length) {
          throw new Error("Ran out of data");
        }
        const byte2 = this.#data[this.#index++];
        this.#leftover.push((byte << 8) + byte2);
        break;
      }
      case 4: {
        const lo = byte & 0x0f;
        const hi = byte >> 4;
        this.#leftover.push(hi, lo);
        break;
      }
      case 2: {
        this.#leftover.push(
          (byte >> 6) & 3,
          (byte >> 4) & 3,
          (byte >> 2) & 3,
          byte & 3,
        );
        break;
      }
      case 1: {
        this.#leftover.push(
          (byte >> 7) & 1,
          (byte >> 6) & 1,
          (byte >> 5) & 1,
          (byte >> 4) & 1,
          (byte >> 3) & 1,
          (byte >> 2) & 1,
          (byte >> 1) & 1,
          byte & 1,
        );
        break;
      }
    }
  }

  get(count) {
    while (this.#leftover.length < count) {
      this.#split();
    }
    return this.#leftover.splice(0, count);
  }

  resetAfterLine() {
    this.#leftover.length = 0;
  }

  end() {
    if (this.#index !== this.#data.length) {
      throw new Error("extra data found");
    }
  }
}

function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
  const { width: imageWidth, height: imageHeight, index: imagePass } = image;
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const pxPos = getPxPos(x, y, imagePass);
      pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
      rawPos += bpp;
    }
  }
  return rawPos;
}

function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
  const { width: imageWidth, height: imageHeight, index: imagePass } = image;
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const pixelData = bits.get(bpp);
      const pxPos = getPxPos(x, y, imagePass);
      pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
    }
    bits.resetAfterLine();
  }
}

export function dataToBitMap(data, bitmapInfo) {
  const { width, height, depth, bpp, interlace } = bitmapInfo;
  let bits;

  if (depth !== 8) {
    bits = new BitReader(data, depth);
  }
  const pxData = depth <= 8 ? new Uint8Array(width * height * 4) : new Uint16Array(width * height * 4);

  const maxBit = 2 ** depth - 1;
  let rawPos = 0;
  let images;
  let getPxPos;

  if (interlace) {
    images = getImagePasses(width, height);
    getPxPos = getInterlaceIterator(width, height);
  } else {
    let nonInterlacedPxPos = 0;
    getPxPos = () => {
      const returner = nonInterlacedPxPos;
      nonInterlacedPxPos += 4;
      return returner;
    };
    images = [{ width, height }];
  }

  for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
    if (depth === 8) {
      rawPos = mapImage8Bit(
        images[imageIndex],
        pxData,
        getPxPos,
        bpp,
        data,
        rawPos,
      );
    } else {
      mapImageCustomBit(
        images[imageIndex],
        pxData,
        getPxPos,
        bpp,
        bits,
        maxBit,
      );
    }
  }
  if (depth === 8) {
    if (rawPos !== data.length) {
      throw new Error("extra data found");
    }
  } else {
    bits.end();
  }

  return pxData;
}
