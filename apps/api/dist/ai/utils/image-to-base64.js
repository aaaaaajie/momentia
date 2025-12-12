"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUrlToBase64 = fetchUrlToBase64;
exports.stripDataUrlPrefix = stripDataUrlPrefix;
exports.isHttpUrl = isHttpUrl;
async function fetchUrlToBase64(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab).toString('base64');
}
function stripDataUrlPrefix(x) {
    const m = x.match(/^data:.*?;base64,(.*)$/i);
    return m ? m[1] : x;
}
function isHttpUrl(x) {
    return /^https?:\/\//i.test(x);
}
//# sourceMappingURL=image-to-base64.js.map