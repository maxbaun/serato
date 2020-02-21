const fs = require('fs');
const pathTypes = require('path-type');
const path = require('path');
const AudioContext = require('web-audio-api').AudioContext;
const toWav = require('audiobuffer-to-wav');
const Lame = require('node-lame').Lame;
const NodeID3 = require('node-id3');

const crateStart = Buffer.from([0x00, 0x53, 0x00, 0x65, 0x00, 0x72, 0x00, 0x61, 0x00, 0x74, 0x00, 0x6f]); // Serato
const osrt = Buffer.from([0x6f, 0x73, 0x72, 0x74]);
const columnSortEnd = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00]);
const tvcn = Buffer.from([0x74, 0x76, 0x63, 0x6e]);
const brev = Buffer.from([0x62, 0x72, 0x65, 0x76]);
const ovct = Buffer.from([0x6f, 0x76, 0x63, 0x74]);
const tvcw = Buffer.from([0x74, 0x76, 0x63, 0x77]);
const otrk = Buffer.from([0x70, 0x74, 0x72, 0x6b]);
const ptrk = Buffer.from([0x70, 0x74, 0x72, 0x6b]);
const orvc = Buffer.from('orvc');

const mp3 = false;
const newExt = mp3 ? 'mp3' : 'wav';
const crateName = '2.22.20 - Jackie & Janelle BU';
const crateStr = `/Volumes/Music/_Serato_/Subcrates/${crateName}.crate`;
const crateFile = fs.readFileSync(crateStr);
const crateParts = crateStr.split('/');
const destFolder = crateParts[crateParts.length - 1].split('.crate')[0];
const destRoot = '/Users/maxbaun/Desktop/Backup/' + destFolder;

const seratoRoot = path.dirname(crateStr).split('_Serato_')[0];

var pointer = crateFile.indexOf(ptrk) + 8; // Advance to start of song info
var songEnd = crateFile.indexOf(otrk, pointer) - 8; // Get end of first song

let songs = [];

while (true) {
  // Get song name
  let song = crateFile
    .slice(pointer, songEnd)
    .swap16()
    .toString('utf16le');

  songs.push(song);
  // Advance to start of next song
  pointer = crateFile.indexOf(ptrk, songEnd);

  if (pointer === -1) {
    break;
  }

  pointer += 8;

  // Advance to end of next song
  songEnd = crateFile.indexOf(otrk, pointer);
  if (songEnd === -1) {
    songEnd = crateFile.length;
  } else {
    songEnd = crateFile.indexOf(otrk, pointer) - 8;
  }
}

if (!fs.existsSync(destRoot)) {
  fs.mkdirSync(destRoot);
}

songs.forEach((song, index) => {
  let s = fs.readFileSync(`${seratoRoot}${song}`);
  let tags = {};

  try {
    tags = NodeID3.read(s);
  } catch (error) {
    console.log('unable to read tags for song: ', song);
  }

  if (mp3) {
    const newName = getSongName(song, index, tags.title, tags.artist);

    const encoder = new Lame({
      output: newName,
      bitrate: 192,
      meta: {
        title: tags.title,
        artist: tags.artist,
        album: tags.album,
        year: tags.year,
        comment: tags.comment ? tags.comment.text : '',
        genre: tags.genre
      }
    }).setBuffer(s);

    encoder
      .decode()
      .then(() => {
        console.log('finished encoding mp3', newName);
      })
      .catch(err => {
        console.log('err encoding', err);
      });
  } else {
    var context = new AudioContext();

    context.decodeAudioData(s, buff => {
      const newName = getSongName(song, index, tags.title, tags.artist);
      const w = toWav(buff);
      fs.writeFileSync(newName, Buffer.from(w), err => {
        console.log(err);
      });
      console.log(newName);
    });
  }
});

function getSongName(song, index, title, artist) {
  const songName = song
    .split('/')
    .pop()
    .split('.')
    .slice(0, 1);
  const prettyIndex = index + 1 < 10 ? `0${index + 1}` : index + 1;
  const newName = `${destRoot}/${prettyIndex} - ${songName}.${newExt}`;

  return newName;
}
