import fs from "fs/promises";

// The browser-supplied mimetype can be faked, so also look at the first bytes
// of the file: PNG, JPEG and WEBP each start with a fixed signature.
export const isRealImage = async (file) => {
  try {
    const handle = await fs.open(file.tempFilePath, "r");
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    await handle.close();
    const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const webp = buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
    return png || jpeg || webp;
  } catch {
    return false;
  }
};
