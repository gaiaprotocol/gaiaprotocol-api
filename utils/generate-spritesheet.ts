import fs from "fs";
import path from "path";
import sharp, { Metadata } from "sharp";
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
import { StringUtils } from "@commonmodule/ts";

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

const directoryPath = "./parts-images-resized";
const outputPath = "./spritesheet";
const spritesheets: string[] = [];

const keyToPart: {
  [filename: string]: {
    row: number;
    col: number;
    zIndex: number;
  };
} = {};

const keyToSpritesheet: {
  [type: string]: {
    [gender: string]: {
      [filename: string]: {
        frame: string;
        zIndex: number;
      };
    };
  };
} = {};

const partSize = 128;

async function createSpritesheetImage(
  files: string[],
  outputFileName: string,
  format = "png",
) {
  const tilesPerRow = Math.ceil(Math.sqrt(files.length));
  const outputWidth = partSize * tilesPerRow;
  const outputHeight = partSize * Math.ceil(files.length / tilesPerRow);

  const background = sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const compositeOperations = files.map((file, index) => {
    const row = Math.floor(index / tilesPerRow);
    const col = index % tilesPerRow;
    const fileId = file.split("/").slice(1).join("/");
    keyToPart[fileId] = {
      row,
      col,
      zIndex: orders[fileId],
    };
    return {
      input: file,
      top: row * partSize,
      left: col * partSize,
    };
  });

  if (format === "jpeg") {
    await background.composite(compositeOperations).jpeg({ quality: 60 })
      .toFile(path.join(outputPath, outputFileName));
  } else {
    await background
      .composite(compositeOperations)
      .toFile(path.join(outputPath, outputFileName));
  }

  console.log(`Created ${outputFileName}`);
}

async function processImages() {
  const metadataMap = new Map<string, Metadata>();

  try {
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const files = fs.readdirSync(directoryPath, { recursive: true });
    for (const file of files) {
      if (typeof file === "string") {
        if (orders[file] !== undefined) {
          const sharpImage = sharp(path.join(directoryPath, file));
          const metadata = await sharpImage.metadata();
          metadataMap.set(file, metadata);
          spritesheets.push(path.join(directoryPath, file));
        } else {
          console.log(`Skipping ${file}`);
        }
      }
    }

    console.log("Spritesheet images:", spritesheets.length);

    await createSpritesheetImage(
      spritesheets,
      "spritesheet.png",
    );

    const spritesheetAtlas: SpritesheetData = {
      frames: {},
      meta: {
        scale: 1,
      },
    };

    let partIndex = 0;

    for (const [key, part] of Object.entries(keyToPart)) {
      const frameId = `part-${partIndex++}`;

      spritesheetAtlas.frames[frameId] = {
        frame: {
          x: part.col * partSize,
          y: part.row * partSize,
          w: partSize,
          h: partSize,
        },
      };

      const s = key.split("/");
      const type = StringUtils.capitalize(s[0]);
      if (!keyToSpritesheet[type]) {
        keyToSpritesheet[type] = {};
      }

      let gender = StringUtils.capitalize(s[1]);
      if (gender === "Background.png") {
        gender = "Man";
        if (!keyToSpritesheet[type][gender]) {
          keyToSpritesheet[type][gender] = {};
        }
        keyToSpritesheet[type][gender][s.slice(1).join("/")] = {
          frame: frameId,
          zIndex: part.zIndex,
        };
        gender = "Woman";
        if (!keyToSpritesheet[type][gender]) {
          keyToSpritesheet[type][gender] = {};
        }
        keyToSpritesheet[type][gender][s.slice(1).join("/")] = {
          frame: frameId,
          zIndex: part.zIndex,
        };
      } else {
        if (!keyToSpritesheet[type][gender]) {
          keyToSpritesheet[type][gender] = {};
        }
        keyToSpritesheet[type][gender][s.slice(1).join("/")] = {
          frame: frameId,
          zIndex: part.zIndex,
        };
      }
    }

    fs.writeFileSync(
      path.join(outputPath, "spritesheet.json"),
      JSON.stringify(spritesheetAtlas, null, 2),
    );

    fs.writeFileSync(
      path.join(outputPath, "key-to-spritesheet.json"),
      JSON.stringify(keyToSpritesheet, null, 2),
    );

    console.log("All files have been processed and saved.");
  } catch (err) {
    console.error("An error occurred:", err);
  }
}

await processImages();
