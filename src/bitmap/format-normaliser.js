function dePalette(indata, outdata, width, height, palette) {
  const byteLength = width * height * 4;
  for (let pxPos = 0; pxPos < byteLength; pxPos += 4) {
    const color = palette[indata[pxPos]];
    if (!color) {
      throw new Error(`index ${indata[pxPos]} not in palette`);
    }

    outdata[pxPos] = color[0];
    outdata[pxPos + 1] = color[1];
    outdata[pxPos + 2] = color[2];
    outdata[pxPos + 3] = color[3];
  }
}

function replaceTransparentColor(indata, outdata, width, height, transColor) {
  const byteLength = width * height * 4;
  for (let pxPos = 0; pxPos < byteLength; pxPos += 4) {
    let makeTrans = false;
    if (transColor.length === 1) {
      if (transColor[0] === indata[pxPos]) {
        makeTrans = true;
      }
    } else if (
      transColor[0] === indata[pxPos]
      && transColor[1] === indata[pxPos + 1]
      && transColor[2] === indata[pxPos + 2]
    ) {
      makeTrans = true;
    }
    if (makeTrans) {
      outdata[pxPos] = 0;
      outdata[pxPos + 1] = 0;
      outdata[pxPos + 2] = 0;
      outdata[pxPos + 3] = 0;
    }
  }
}

function scaleDepth(indata, outdata, width, height, depth) {
  const scale = 255 / (2 ** depth - 1);
  const byteLength = width * height * 4;

  for (let pxPos = 0; pxPos < byteLength; pxPos += 4) {
    for (let i = 0; i < 4; i++) {
      outdata[pxPos + i] = Math.floor(indata[pxPos + i] * scale + 0.5);
    }
  }
}

export function formatNormaliser(indata, imageData, skipRescale = false) {
  const {
    depth,
    width,
    height,
    colorType,
    transColor,
    palette,
  } = imageData;

  let outdata = indata; // only different for 16 bits

  if (colorType === 3) {
    // paletted
    dePalette(indata, outdata, width, height, palette);
    return outdata;
  }
  if (transColor) {
    replaceTransparentColor(indata, outdata, width, height, transColor);
  }
  // if it needs scaling
  if (depth !== 8 && !skipRescale) {
    // if we need to change the buffer size
    if (depth === 16) {
      outdata = new Uint8Array(width * height * 4);
    }
    scaleDepth(indata, outdata, width, height, depth);
  }
  return outdata;
}
