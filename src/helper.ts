import { parseBlob, selectCover } from "music-metadata-browser";

export const getCoverFromFile = async (fileUrl: string) => {
  const file = await fetch(fileUrl);
  const fileBlob = await file.blob();
  const metadata = await parseBlob(fileBlob);
  const cover = selectCover(metadata.common.picture); // pick the cover image
  //  make cover blob url
  if (cover) {
    const coverBlob = new Blob([cover.data], { type: cover.format });
    return URL.createObjectURL(coverBlob);
  }
};
