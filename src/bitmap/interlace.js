// Adam 7
//   0 1 2 3 4 5 6 7
// 0 x 6 4 6 x 6 4 6
// 1 7 7 7 7 7 7 7 7
// 2 5 6 5 6 5 6 5 6
// 3 7 7 7 7 7 7 7 7
// 4 3 6 4 6 3 6 4 6
// 5 7 7 7 7 7 7 7 7
// 6 5 6 5 6 5 6 5 6
// 7 7 7 7 7 7 7 7 7

const imagePasses = [
  {
    // pass 1 - 1px
    x: [0],
    y: [0],
  },
  {
    // pass 2 - 1px
    x: [4],
    y: [0],
  },
  {
    // pass 3 - 2px
    x: [0, 4],
    y: [4],
  },
  {
    // pass 4 - 4px
    x: [2, 6],
    y: [0, 4],
  },
  {
    // pass 5 - 8px
    x: [0, 2, 4, 6],
    y: [2, 6],
  },
  {
    // pass 6 - 16px
    x: [1, 3, 5, 7],
    y: [0, 2, 4, 6],
  },
  {
    // pass 7 - 32px
    x: [0, 1, 2, 3, 4, 5, 6, 7],
    y: [1, 3, 5, 7],
  },
];

export function getImagePasses(width, height) {
  const images = [];
  const xLeftOver = width % 8;
  const yLeftOver = height % 8;
  const xRepeats = (width - xLeftOver) / 8;
  const yRepeats = (height - yLeftOver) / 8;
  for (let i = 0; i < imagePasses.length; i++) {
    const { x, y } = imagePasses[i];
    let passWidth = xRepeats * x.length;
    let passHeight = yRepeats * y.length;
    for (let j = 0; j < x.length; j++) {
      if (x[j] < xLeftOver) {
        passWidth++;
      } else {
        break;
      }
    }
    for (let j = 0; j < y.length; j++) {
      if (y[j] < yLeftOver) {
        passHeight++;
      } else {
        break;
      }
    }
    if (passWidth > 0 && passHeight > 0) {
      images.push({ width: passWidth, height: passHeight, index: i });
    }
  }
  return images;
}

export function getInterlaceIterator(width) {
  return function(x, y, pass) {
    const { x: passX, y: passY } = imagePasses[pass];
    const xOffset = x % passX.length;
    const yOffset = y % passY.length;
    const outerX = Math.floor(x / passX.length) * 8 + passX[xOffset];
    const outerY = Math.floor(y / passY.length) * 8 + passY[yOffset];

    return (outerY * width + outerX) * 4;
  };
}
