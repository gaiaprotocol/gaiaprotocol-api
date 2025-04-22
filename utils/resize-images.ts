import fs from "fs";
import path from "path";
import sharp from "sharp";
import fireManParts from "./parts-jsons/fire-man-parts.json" with {
  type: "json",
};
import fireWomanParts from "./parts-jsons/fire-woman-parts.json" with {
  type: "json",
};
import stoneManParts from "./parts-jsons/stone-man-parts.json" with {
  type: "json",
};
import stoneWomanParts from "./parts-jsons/stone-woman-parts.json" with {
  type: "json",
};
import waterManParts from "./parts-jsons/water-man-parts.json" with {
  type: "json",
};
import waterWomanParts from "./parts-jsons/water-woman-parts.json" with {
  type: "json",
};

interface SpritesheetData {
  frames: {
    [frame: string]: {
      frame: {
        x: number;
        y: number;
        w: number;
        h: number;
      };
    };
  };
  meta: {
    scale: number | string;
  };
}

const orders: { [path: string]: number } = {};
for (
  const p of [
    ...stoneManParts,
    ...stoneWomanParts,
  ]
) {
  for (const part of p.parts) {
    if (part.images) {
      for (const frame of part.images) {
        orders["stone/" + frame.path] = frame.order;
      }
    }
  }
}
for (
  const p of [
    ...fireManParts,
    ...fireWomanParts,
  ]
) {
  for (const part of p.parts) {
    if (part.images) {
      for (const frame of part.images) {
        orders["fire/" + frame.path] = frame.order;
      }
    }
  }
}
for (
  const p of [
    ...waterManParts,
    ...waterWomanParts,
  ]
) {
  for (const part of p.parts) {
    if (part.images) {
      for (const frame of part.images) {
        orders["water/" + frame.path] = frame.order;
      }
    }
  }
}

const directoryPath = "./parts-images";
const outputPath = "./parts-images-resized";

const partSize = 128;

async function processImages() {
  try {
    const files = fs.readdirSync(directoryPath, { recursive: true });
    for (const file of files) {
      if (typeof file === "string") {
        if (orders[file] !== undefined) {
          const sharpImage = sharp(path.join(directoryPath, file));

          if (!fs.existsSync(path.join(outputPath, path.dirname(file)))) {
            fs.mkdirSync(path.join(outputPath, path.dirname(file)), {
              recursive: true,
            });
          }

          await sharpImage.resize(partSize, partSize, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          }).toFile(path.join(outputPath, file));

          console.log(`Processed ${file}`);
        } else {
          console.log(`Skipping ${file}`);
        }
      }
    }

    console.log("All files have been processed and saved.");
  } catch (err) {
    console.error("An error occurred:", err);
  }
}

await processImages();
