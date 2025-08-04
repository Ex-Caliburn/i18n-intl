const crypto = require("crypto");
import { getKeyBySourceText, updateFilesKey } from "./index";
function generateKey(keyPrefix: string, str: string) {
  const key = getKeyBySourceText(str);
  if (key) {
    const match = key.split(".");
    // const newKey = `common.${match[match.length - 1]}`;
    // updateFilesKey({oldKey: key, newKey});
    // return newKey;
    return key;
  } else {
    const hash = crypto.createHash("md5");
    hash.update(str, "utf8");
    const hashPart = hash.digest("hex").substring(0, 8);
    return `${keyPrefix}.${hashPart}`;
  }
}

export default generateKey;
