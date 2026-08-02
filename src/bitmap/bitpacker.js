import constants from "../shared/constants.js";

export function bitPacker(dataIn, width, height, options) {
  const {
    bitDepth,
    colorType,
    inputColorType,
    inputHasAlpha,
    bgColor,
  } = options;
  function writeU16BE(out, offset, value) {
    out[offset] = value >>> 8;
    out[offset + 1] = value & 0xff;
  }

  function readU16BE(data, offset) {
    return (data[offset] << 8) | data[offset + 1];
  }

  const outHasAlpha = [
    constants.COLORTYPE_COLOR_ALPHA,
    constants.COLORTYPE_ALPHA,
  ].includes(colorType);

  if (
    colorType === inputColorType
    && bitDepth === 8
  ) {
    return dataIn;
  }
  // map to a UInt16 array if data is 16bit, fix endianness below
  const data = dataIn;

  let maxValue = 255;
  let inBpp = constants.COLORTYPE_TO_BPP_MAP[inputColorType];
  if (inBpp === 4 && !inputHasAlpha) {
    inBpp = 3;
  }
  let outBpp = constants.COLORTYPE_TO_BPP_MAP[colorType];
  if (bitDepth === 16) {
    maxValue = 65535;
    inBpp *= 2;
    outBpp *= 2;
  }
  let outData = new Uint8Array(width * height * outBpp);

  let inIndex = 0;
  let outIndex = 0;

  const bg = bgColor ?? {};
  const bgRed = bg.red ?? maxValue;
  const bgGreen = bg.green ?? maxValue;
  const bgBlue = bg.blue ?? maxValue;
  let red;
  let green;
  let blue;
  let alpha;

  function readRGBA() {
    alpha = maxValue;
    switch (inputColorType) {
      case constants.COLORTYPE_COLOR_ALPHA: {
        if (bitDepth === 8) {
          red = data[inIndex];
          green = data[inIndex + 1];
          blue = data[inIndex + 2];
          alpha = data[inIndex + 3];
        } else {
          red = readU16BE(data, inIndex);
          green = readU16BE(data, inIndex + 2);
          blue = readU16BE(data, inIndex + 4);
          alpha = readU16BE(data, inIndex + 6);
        }
        break;
      }
      case constants.COLORTYPE_COLOR: {
        if (bitDepth === 8) {
          red = data[inIndex];
          green = data[inIndex + 1];
          blue = data[inIndex + 2];
        } else {
          red = readU16BE(data, inIndex);
          green = readU16BE(data, inIndex + 2);
          blue = readU16BE(data, inIndex + 4);
        }
        break;
      }
      case constants.COLORTYPE_ALPHA: {
        if (bitDepth === 8) {
          red = green = blue = data[inIndex];
          alpha = data[inIndex + 1];
        } else {
          red = green = blue = readU16BE(data, inIndex);
          alpha = readU16BE(data, inIndex + 2);
        }
        break;
      }
      case constants.COLORTYPE_GRAYSCALE: {
        if (bitDepth === 8) {
          red = green = blue = data[inIndex];
        } else {
          red = green = blue = readU16BE(data, inIndex);
        }
        break;
      }
      default: {
        throw new Error(`Unsupported input color type: ${inputColorType}`);
      }
    }

    if (inputHasAlpha && !outHasAlpha) {
      const a = alpha / maxValue;
      red = Math.round((1 - a) * bgRed + a * red);
      green = Math.round((1 - a) * bgGreen + a * green);
      blue = Math.round((1 - a) * bgBlue + a * blue);
    }
  }

  const pixels = width * height;

  for (let i = 0; i < pixels; i++) {
    readRGBA();

    switch (colorType) {
      case constants.COLORTYPE_COLOR_ALPHA:
      case constants.COLORTYPE_COLOR:
        if (bitDepth === 8) {
          outData[outIndex] = red;
          outData[outIndex + 1] = green;
          outData[outIndex + 2] = blue;

          if (outHasAlpha) {
            outData[outIndex + 3] = alpha;
          }
        } else {
          writeU16BE(outData, outIndex, red);
          writeU16BE(outData, outIndex + 2, green);
          writeU16BE(outData, outIndex + 4, blue);

          if (outHasAlpha) {
            writeU16BE(outData, outIndex + 6, alpha);
          }
        }
        break;
      case constants.COLORTYPE_ALPHA:
      case constants.COLORTYPE_GRAYSCALE: {
        // Convert to grayscale and alpha
        const gray = Math.round((red + green + blue) / 3);
        if (bitDepth === 8) {
          outData[outIndex] = gray;
          if (outHasAlpha) {
            outData[outIndex + 1] = alpha;
          }
        } else {
          writeU16BE(outData, outIndex, gray);
          if (outHasAlpha) {
            writeU16BE(outData, outIndex + 2, alpha);
          }
        }
        break;
      }
      default:
        throw new Error(`Unknown color type: ${colorType}`);
    }

    inIndex += inBpp;
    outIndex += outBpp;
  }

  return outData;
}
