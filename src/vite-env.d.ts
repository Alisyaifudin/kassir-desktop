/// <reference types="vite/client" />

declare module "*.ttf?arraybuffer" {
  const content: ArrayBuffer;
  export default content;
}
