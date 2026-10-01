/**
 * Wraps one PNG image into an ICO file (`favicon.ico`), which every current browser reads.
 * The layout is a 6-byte ICONDIR header, one 16-byte ICONDIRENTRY, then the PNG bytes.
 * `size` is the image's width and height in pixels, at most 256.
 */
export function pngToIco(png: Uint8Array, size: number): Uint8Array<ArrayBuffer> {
  if (!(Number.isInteger(size) && size > 0 && size <= 256)) {
    throw new Error(`An ICO image is 1 to 256 pixels wide, not ${size}.`);
  }
  const headerSize = 6 + 16;
  const ico = new Uint8Array(headerSize + png.length);
  const view = new DataView(ico.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, 1, true); // number of images
  view.setUint8(6, size % 256); // width; 0 means 256
  view.setUint8(7, size % 256); // height
  view.setUint8(8, 0); // colours in the palette: none
  view.setUint8(9, 0); // reserved
  view.setUint16(10, 1, true); // colour planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, png.length, true); // image size
  view.setUint32(18, headerSize, true); // image offset
  ico.set(png, headerSize);
  return ico;
}
