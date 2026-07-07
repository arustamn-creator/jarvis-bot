const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const TMP_DIR = path.join(__dirname, 'tmp');

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

// ffmpeg печатает список dshow-устройств в stderr и завершается с ошибкой —
// это ожидаемо, поэтому err игнорируем и парсим stderr.
async function detectMicDevice() {
  if (process.env.MIC_DEVICE) return process.env.MIC_DEVICE;

  const stderr = await new Promise((resolve) => {
    execFile(
      ffmpegPath,
      ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'],
      { windowsHide: true },
      (_err, _stdout, stderr) => resolve(stderr || '')
    );
  });

  const devices = [...stderr.matchAll(/"([^"]+)"\s*\(audio\)/g)].map((m) => m[1]);
  if (devices.length === 0) {
    throw new Error('Микрофон не найден (dshow). Укажи имя устройства в MIC_DEVICE в .env');
  }
  return devices[0];
}

class Recorder {
  constructor(device) {
    this.device = device;
    this.proc = null;
    this.outPath = null;
    this.startedAt = 0;
  }

  start() {
    if (this.proc) return;
    ensureTmpDir();
    this.outPath = path.join(TMP_DIR, `rec_${Date.now()}.wav`);
    this.startedAt = Date.now();
    this.proc = spawn(
      ffmpegPath,
      [
        '-hide_banner', '-loglevel', 'error',
        '-f', 'dshow',
        '-i', `audio=${this.device}`,
        '-ac', '1',
        '-ar', '16000',
        '-y', this.outPath,
      ],
      { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] }
    );
    this.proc.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) console.error('[recorder] ffmpeg:', msg);
    });
  }

  // Останавливает запись командой 'q' в stdin ffmpeg (корректно закрывает WAV,
  // сигналы на Windows ненадёжны). Возвращает { path, durationMs } или null,
  // если запись слишком короткая/пустая.
  async stop() {
    if (!this.proc) return null;
    const proc = this.proc;
    const outPath = this.outPath;
    const durationMs = Date.now() - this.startedAt;
    this.proc = null;

    await new Promise((resolve) => {
      proc.once('close', resolve);
      try {
        proc.stdin.write('q');
        proc.stdin.end();
      } catch (_) {
        proc.kill();
      }
      // Страховка: если ffmpeg не вышел за 3 секунды — убиваем.
      setTimeout(() => proc.kill(), 3000).unref();
    });

    if (durationMs < 400 || !fs.existsSync(outPath) || fs.statSync(outPath).size < 8000) {
      cleanup(outPath);
      return null;
    }
    return { path: outPath, durationMs };
  }
}

function cleanup(file) {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch (_) {}
}

module.exports = { Recorder, detectMicDevice, cleanup };
