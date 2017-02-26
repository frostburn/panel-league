const isFunction = require('lodash/isFunction');


const AudioContext = (window.AudioContext || window.webkitAudioContext);
const {
  abs,
  acos,
  acosh,
  asin,
  asinh,
  atan,
  atan2,
  atanh,
  cbrt,
  ceil,
  clz32,
  cos,
  cosh,
  exp,
  expm1,
  floor,
  fround,
  hypot,
  imul,
  log,
  log10,
  log1p,
  log2,
  max,
  min,
  pow,
  random,
  round,
  sign,
  sin,
  sinh,
  sqrt,
  tan,
  tanh,
  trunc,
} = Math;
const pi = Math.PI;
const tau = 2 * pi;
const sine = (phase => sin(tau * phase));

class SoundGenerator {
  constructor() {
    this.audioCtx = null;
    if (isFunction(AudioContext)) {
      this.audioCtx = new AudioContext();
      this.sampleRate = this.audioCtx.sampleRate;
    }
  }

  functionProcessor(func, maxDelay) {
    if (!this.audioCtx) {
      return;
    }
    const processor = this.audioCtx.createScriptProcessor();
    const bufferLength = maxDelay || this.sampleRate;
    const inputBuffer = new Float32Array(bufferLength);
    const delayBuffer = new Float32Array(bufferLength);
    const getPreviousInputSample = ((delay) => inputBuffer[(index - delay + bufferLength) % bufferLength]);
    const getPreviousSample = ((delay) => delayBuffer[(index - delay + bufferLength) % bufferLength]);
    let index = 0;

    processor.onaudioprocess = ((event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const outputData = event.outputBuffer.getChannelData(0);

      for (let i = 0; i < outputData.length; ++i) {
          inputBuffer[index % bufferLength] = inputData[i];
          const t = index / this.sampleRate;
          const sample = func(t, getPreviousSample, getPreviousInputSample);

          outputData[i] = sample;
          delayBuffer[index % bufferLength] = sample;
          ++index;
      }
    });
    return processor;
  }

  play(node, duration) {
    if (!this.audioCtx) {
      return;
    }
    node.connect(this.audioCtx.destination);
    setTimeout(() => {
      node.disconnect();
    }, 1000 * duration);
  }

  brownNoise() {
    const f = ((t, d) => Math.random() * 0.03 + d(1) * 0.98);

    return this.functionProcessor(f);
  }

  blib() {
    const b = this.brownNoise();
    const f = ((t, d, i) => i(0) * 0.2 - d(500) * 0.9 + d(400 + Math.floor(t * 100)) * 0.1);
    const p = this.functionProcessor(f);

    b.connect(p);
    this.play(p, 2);
    console.log("kikkuul");
  }

  pow(frequency=440, volume=0.5, decay=10) {
    const p = this.functionProcessor((t) => (
      Math.tanh(sine(frequency * Math.exp(-t)) * Math.exp(2 - decay * t)) * volume
    ));

    this.play(p, 5 / decay);
  }

  bump(frequency=880, volume=0.3) {
    const p = this.functionProcessor(
      t => tanh(sine(frequency*t*exp(-t*5)) * exp(20*t)) * exp(-t*50) * volume
    );
    this.play(p, 0.5);
  }

  gunshot() {
    const b = this.brownNoise();
    const r = this.functionProcessor(
      (t, d, i) => sine(exp(-t)*300 * t + random() * exp(-t*20) * 0.5 + i(0) * 5.3 + 0.6*d(1) - d(2) + 0.8*d(3) + sine(200*t * exp(-t * 24))) * (sine(40*t*exp(-t)) + 3) * 0.05 * exp(-6*t)
    );
    b.connect(r);
    this.play(r, 1);
  }

  zap(f=500) {
    const r = this.functionProcessor(
      t => sine(33.4*t*f*t*exp(0.1*t) + 0.2*tanh(10*sine(1*f*t*exp(t*1)))) * 0.15 * exp(-30*t)
    )
    this.play(r, 0.5);
  }

  woosh(f=250) {
    const r = 2.03;
    const x = this.functionProcessor(t => {
      t *= exp(0.5*t)
      return tanh(sine(t*f*t + sine(4.01*t*f)*exp(-t*5)*3 + (t+0.1)*tan(-1.4*sine(t*f*r)))*5*t*exp(-15*t));
    })
    this.play(x, 1);
  }
}

module.exports = SoundGenerator;
