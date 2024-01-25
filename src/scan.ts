import { Eidos, EidosTable } from "@eidos.space/types";

import { parseBlob } from "music-metadata-browser";

declare const eidos: Eidos;

export interface Env {
  // add your environment variables here
}

export interface Table {
  // add your tables here
  // key is a variable name of field you want to use, value is id of the field instance
  songs: EidosTable<{
    title: string;
    source: string;
    album: string;
    artist: string;
    artists: string;
  }>;
}

export interface Input {
  // add your input fields here
}

export interface Context {
  env: Env;
  tables: Table;
  currentRowId?: string;
}

export async function scan(input: Input, context: Context) {
  const res = await eidos.currentSpace.listFiles();
  const songTableId = context.tables.songs.id;
  const fieldMap = context.tables.songs.fieldsMap;
  const oldRows = await eidos.currentSpace.table(songTableId).rows.query();
  const fileSourceSet = new Set(oldRows.map((i) => i.source));

  for (const item of res) {
    const source = item.path.replace("spaces/", "https://eidos.space/");
    if (item.mime.startsWith("audio/")) {
      if (!fileSourceSet.has(source)) {
        const fileUrl = await eidos.currentSpace.file.getBlobURLbyPath(
          item.path
        );
        const file = await fetch(fileUrl!);
        const fileBlob = await file.blob();
        const metadata = await parseBlob(fileBlob);
        const { title, album, artist, artists } = metadata.common;
        await eidos.currentSpace.table(songTableId).rows.create(
          {
            [fieldMap.title]: title,
            [fieldMap.source]: source,
            [fieldMap.album]: album,
            [fieldMap.artist]: artist,
            [fieldMap.artists]: artists?.join(", "),
          },
          {
            useFieldId: true,
          }
        );
      }
    }
  }
}
