import { StringUtils } from "@commonmodule/ts";
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

const availableFiles: { [path: string]: boolean } = {};
for (
  const p of [
    ...stoneManParts,
    ...stoneWomanParts,
  ]
) {
  for (const part of p.parts) {
    if (part.images) {
      for (const frame of part.images) {
        availableFiles["stone/" + frame.path] = true;
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
        availableFiles["fire/" + frame.path] = true;
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
        availableFiles["water/" + frame.path] = true;
      }
    }
  }
}

const directoryPath = "./parts-images-resized";
const outputPath = "./spritesheet";
const spritesheets: string[] = [];

const keyToPart: { [filename: string]: { row: number; col: number } } = {};
const keyToFrame: {
  [type: string]: { [gender: string]: { [filename: string]: string } };
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
    keyToPart[fileId] = { row, col };
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
        if (availableFiles[file]) {
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
      if (!keyToFrame[type]) {
        keyToFrame[type] = {};
      }

      let gender = StringUtils.capitalize(s[1]);
      if (gender === "Background.png") {
        gender = "Man";
        if (!keyToFrame[type][gender]) keyToFrame[type][gender] = {};
        keyToFrame[type][gender][s.slice(1).join("/")] = frameId;
        gender = "Woman";
        if (!keyToFrame[type][gender]) keyToFrame[type][gender] = {};
        keyToFrame[type][gender][s.slice(1).join("/")] = frameId;
      } else {
        if (!keyToFrame[type][gender]) keyToFrame[type][gender] = {};
        keyToFrame[type][gender][s.slice(1).join("/")] = frameId;
      }
    }

    fs.writeFileSync(
      path.join(outputPath, "spritesheet.json"),
      JSON.stringify(spritesheetAtlas, null, 2),
    );

    fs.writeFileSync(
      path.join(outputPath, "key-to-frame.json"),
      JSON.stringify(keyToFrame, null, 2),
    );

    console.log("All files have been processed and saved.");
  } catch (err) {
    console.error("An error occurred:", err);
  }
}

await processImages();
