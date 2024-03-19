import { parseBlob, selectCover } from "music-metadata-browser";

const blobToBase64 = (blob: Blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const getCoverFromFile = async (fileBlob: Blob) => {
  const metadata = await parseBlob(fileBlob);
  const cover = selectCover(metadata.common.picture); // pick the cover image
  //  make cover blob url
  if (cover) {
    const coverBlob = new Blob([cover.data], { type: cover.format });
    return await blobToBase64(coverBlob);
  }
};
