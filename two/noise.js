class RandomNoiseProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    output.forEach((channel) => {
      for (let i = 0; i < channel.length; i++) {
        channel[i] = Math.random() * 0.01 - 0.005;
        if (Math.random()> 0.9995){
          channel[i] += Math.random() * 2 - 1;
        }
      }
    });
    return true;
  }
}

registerProcessor("noise-processor", RandomNoiseProcessor);