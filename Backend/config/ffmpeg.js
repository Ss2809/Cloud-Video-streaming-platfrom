const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

// Configure fluent-ffmpeg to use pre-compiled binaries
if (ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

if (ffprobeInstaller.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

module.exports = {
  ffmpeg,
  ffmpegPath: ffmpegInstaller.path,
  ffprobePath: ffprobeInstaller.path,
};
