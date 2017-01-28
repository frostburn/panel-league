const isFunction = require('lodash/isFunction');
const AudioContext = (window.AudioContext || window.webkitAudioContext);
let audioCtx;
let sampleRate;
if (isFunction(AudioContext)) {
  audioCtx = new AudioContext();
  sampleRate = audioCtx.sampleRate;
}

const playData = ((data) => {
  if (!audioCtx) {
    return;
  }
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

const playFunction = ((func, duration) => {
  if (!audioCtx) {
    return;
  }
  const processor = audioCtx.createScriptProcessor();
  processor.connect(audioCtx.destination)

  let index = 0;
  processor.onaudioprocess = ((event) => {
    const buffer = event.outputBuffer.getChannelData(0);
    for (let i = 0; i < buffer.length; ++i) {
        const t = index / sampleRate;
        buffer[i] = func(t);
        ++index;
    }
  });
  setTimeout(() => {
    processor.disconnect();
  }, 1000 * duration);
});

const envelope = ((t) => t * Math.exp(1 - t));
const sine = ((phase) => Math.sin(2 * Math.PI * phase));

module.exports.ping = ((frequency, volume, duration) => {
  if (!audioCtx) {
    return;
  }
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.01 * volume, audioCtx.currentTime + duration);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
  setTimeout(() => {
    oscillator.disconnect();
    gain.disconnect();
  }, 1000 * duration);
});

module.exports.pow = ((frequency, volume, decay) => {
  playFunction((t) => (
    Math.tanh(sine(frequency * Math.exp(-t)) * Math.exp(2 - decay * t)) * volume
  ), 5 / decay);
});

module.exports.fanfare = ((frequencies, volume, duration) => {
  playFunction((t) => {
    result = 0;
    frequencies.forEach((freq, index) => {
      const mu = duration * index / frequencies.length;
      if (mu < t) {
        const lt = t - mu;
        const p = 2 * Math.PI * lt * freq;
        result += envelope(15 * lt) * Math.sin(p + Math.sin(3 * p));
      }
    });
    return result * volume;
  }, duration + 0.5);
});

module.exports.buzz = ((frequency, volume, duration) => {
  playFunction((t) => (
    sine(frequency * t) * envelope(3 * t / duration) * Math.random() * volume
  ), duration * 1.2);
});
