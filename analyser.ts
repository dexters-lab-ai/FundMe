/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Analyser class for live audio visualisation.
 */
export class Analyser {
  private analyser: AnalyserNode;
  private bufferLength = 0;
  private dataArray: Uint8Array;

  constructor(node: AudioNode) {
    this.analyser = node.context.createAnalyser();
    this.analyser.fftSize = 32;
    this.bufferLength = this.analyser.frequencyBinCount;
    // Create a buffer with the correct size and then create a Uint8Array view of it
    const buffer = new ArrayBuffer(this.bufferLength);
    this.dataArray = new Uint8Array(buffer);
    node.connect(this.analyser);
  }

  update(): void {
    // Use type assertion to handle the Uint8Array type
    (this.analyser as any).getByteFrequencyData(this.dataArray);
  }

  get data(): Uint8Array {
    return this.dataArray;
  }
}
