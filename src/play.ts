import { Eidos } from "@eidos.space/types";
import { getCoverFromFile } from "./helper";
import { Env, Table } from "./scan";
declare const eidos: Eidos;

export interface Input {
  // add your input fields here
  title?: string;
}

export interface Context {
  env: Env;
  tables: Table;
  currentRowId?: string;
}

export async function play(input: Input, context: Context) {
  const songTableId = context.tables.songs.id;
  const fieldMap = context.tables.songs.fieldsMap;
  let songs: Record<string, any>[] = [];
  if (context.currentRowId) {
    songs = await eidos.currentSpace.table(songTableId).rows.query(
      {
        _id: context.currentRowId,
      },
      { raw: true }
    );
  } else {
    songs = await eidos.currentSpace
      .table(songTableId)
      .rows.query({}, { raw: true });
  }
  async function getAwesomePlaylist(name?: string) {
    let songList = songs;
    if (name?.length) {
      const index = songs.findIndex((song) => song[fieldMap.title] === name);
      songList = songList.slice(index);
    }
    return songList.map((row) => ({
      title: row[fieldMap.title],
      src: row[fieldMap.source],
      album: row[fieldMap.album],
      artist: row[fieldMap.artist],
    }));
  }
  const log = console.log;
  let audio = document.createElement("audio");

  let playlist = await getAwesomePlaylist(input.title);

  let index = 0;
  await playAudio();
  async function playAudio() {
    const src = playlist[index].src;
    const url = new URL(src);
    let path: string = url.toString();
    if (url.host == "eidos.space") {
      path = url.pathname;
    }

    const file = await eidos.currentSpace.file.getBlobByPath(
      `spaces${decodeURIComponent(path)}`
    );
    const fileUrl = URL.createObjectURL(file);

    if (fileUrl) {
      audio.src = fileUrl;
      const artwork = await getCoverFromFile(fileUrl);
      audio
        .play()
        .then((_) => updateMetadata(artwork))
        .catch((error) => log(error));
    }
  }

  function updateMetadata(artwork: string | undefined) {
    let track = playlist[index];

    log("Playing " + track.title + " track...");
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: artwork
        ? [
            {
              src: artwork,
            },
          ]
        : undefined,
    });

    // Media is loaded, set the duration.
    updatePositionState();
  }

  /* Position state (supported since Chrome 81) */

  function updatePositionState() {
    if ("setPositionState" in navigator.mediaSession) {
      log("Updating position state...");
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    }
  }

  /* Previous Track & Next Track */

  navigator.mediaSession.setActionHandler("previoustrack", function () {
    log('> User clicked "Previous Track" icon.');
    index = (index - 1 + playlist.length) % playlist.length;
    playAudio();
  });

  navigator.mediaSession.setActionHandler("nexttrack", function () {
    log('> User clicked "Next Track" icon.');
    index = (index + 1) % playlist.length;
    playAudio();
  });

  audio.addEventListener("ended", function () {
    // Play automatically the next track when audio ends.
    index = (index - 1 + playlist.length) % playlist.length;
    playAudio();
  });

  /* Seek Backward & Seek Forward */

  let defaultSkipTime = 10; /* Time to skip in seconds by default */

  navigator.mediaSession.setActionHandler("seekbackward", function (event) {
    log('> User clicked "Seek Backward" icon.');
    const skipTime = event.seekOffset || defaultSkipTime;
    audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
    updatePositionState();
  });

  navigator.mediaSession.setActionHandler("seekforward", function (event) {
    log('> User clicked "Seek Forward" icon.');
    const skipTime = event.seekOffset || defaultSkipTime;
    audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration);
    updatePositionState();
  });

  /* Play & Pause */

  navigator.mediaSession.setActionHandler("play", async function () {
    log('> User clicked "Play" icon.');
    await audio.play();
    navigator.mediaSession.playbackState = "playing";
    // Do something more than just playing audio...
  });

  navigator.mediaSession.setActionHandler("pause", function () {
    log('> User clicked "Pause" icon.');
    audio.pause();
    navigator.mediaSession.playbackState = "paused";
    // Do something more than just pausing audio...
  });

  /* Stop (supported since Chrome 77) */

  try {
    navigator.mediaSession.setActionHandler("stop", function () {
      log('> User clicked "Stop" icon.');
      // TODO: Clear UI playback...
    });
  } catch (error) {
    log('Warning! The "stop" media session action is not supported.');
  }

  /* Seek To (supported since Chrome 78) */

  try {
    navigator.mediaSession.setActionHandler("seekto", function (event) {
      log('> User clicked "Seek To" icon.');
      if (event.fastSeek && "fastSeek" in audio) {
        audio.fastSeek(event.seekTime ?? 0);
        return;
      }
      audio.currentTime = event.seekTime ?? 0;

      updatePositionState();
    });
  } catch (error) {
    log('Warning! The "seekto" media session action is not supported.');
  }
}
