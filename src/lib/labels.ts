import bwipjs from "bwip-js/node";

export function barcodeSvg(text: string): string {
  return bwipjs.toSVG({ bcid: "code128", text, height: 12, includetext: false });
}

export function qrSvg(text: string): string {
  return bwipjs.toSVG({ bcid: "qrcode", text});
}
