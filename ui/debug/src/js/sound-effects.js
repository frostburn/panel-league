const isFunction = require('lodash/isFunction');
const AudioContext = (window.AudioContext || window.webkitAudioContext);
let audioCtx;
let sampleRate;
if (isFunction(AudioContext)) {
  audioCtx = new AudioContext();
  sampleRate = audioCtx.sampleRate;
}

const playData = ((data) => {
  const numChannels = 1;
  const buffer = audioCtx.createBuffer(numChannels, data.length, sampleRate);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  buffer.getChannelData(0).set(data);
  source.start();
  setTimeout(() => {
    source.disconnect();
  }, 1000 * data.length / sampleRate + 100);
});

const envelope = ((t) => t * Math.exp(1 - t));

module.exports.ping = ((frequency, volume, decay) => {
  if (!audioCtx) {
    return;
  }
  const duration = 5 / decay;
  const data = new Float32Array(duration * sampleRate);
  for (let i = 0; i < data.length; ++i) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-decay * t) * volume;
  }
  playData(data);
});

module.exports.pow = ((frequency, volume, decay) => {
  if (!audioCtx) {
    return;
  }
  const duration = 5 / decay;
  const data = new Float32Array(duration * sampleRate);
  for (let i = 0; i < data.length; ++i) {
    const t = i / sampleRate;
    data[i] = Math.tanh(Math.sin(2 * Math.PI * frequency * Math.exp(-t)) * Math.exp(2-decay * t)) * volume;
  }
  playData(data);
});


module.exports.fanfare = ((frequencies, volume, duration) => {
  if (!audioCtx) {
    return;
  }
  const data = new Float32Array((duration + 0.5) * sampleRate);
  for (let i = 0; i < data.length; ++i) {
    const t = i / sampleRate;
    result = 0;
    frequencies.forEach((freq, index) => {
      const mu = duration * index / frequencies.length;
      if (mu < t) {
        const lt = t - mu;
        const p = 2 * Math.PI * lt * freq;
        result += envelope(15 * lt) * Math.sin(p + Math.sin(3 * p));
      }
    });
    data[i] = result * volume;
  }
  playData(data);
});

module.exports.buzz = ((frequency, volume, duration) => {
  if (!audioCtx) {
    return;
  }
  duration *= 1.2;
  const data = new Float32Array(duration * sampleRate);
  for (let i = 0; i < data.length; ++i) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * t * frequency) * envelope(3 * t / duration) * Math.random() * volume;
  }
  playData(data);
});
