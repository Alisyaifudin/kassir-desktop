import { Effect } from "effect";
import { TextDecoderError, TextEncoderError } from "./effect-error";
import { log } from "./log";

export const textUtil = {
  encode: encodeTextToBinary,
  decode: decodeBinaryToString,
};

/**
 * Encodes a string to an array of bytes (0-255) using UTF-8.
 * `TextEncoder.encode()` never throws per spec (surrogates replaced with U+FFFD),
 * but we guard against OOM / unexpected runtime errors anyway.
 * @param text - The string to encode
 * @returns Array of numbers representing bytes
 */
function encodeTextToBinary(text: string): Effect.Effect<number[], TextEncoderError> {
  if (text.length === 0) {
    return Effect.succeed([]);
  }

  try {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(text);
    const bytes: number[] = Array.from(uint8Array);
    return Effect.succeed(bytes);
  } catch (error) {
    log.error(error);
    return TextEncoderError.fail(error);
  }
}

/**
 * Decodes an array of bytes (0-255) to a UTF-8 string.
 * Invalid UTF-8 sequences are replaced with U+FFFD (fatal: false).
 * @param binaryData - Array of numbers representing bytes
 * @returns Decoded string, or empty string if input is empty/invalid
 */
function decodeBinaryToString(
  binaryData: number[],
): Effect.Effect<string, TextDecoderError> {
  // Validate and filter bytes
  const validBytes: number[] = [];
  for (let i = 0; i < binaryData.length; i++) {
    const byte = binaryData[i];
    if (typeof byte === "number" && !isNaN(byte) && byte >= 0 && byte <= 255) {
      validBytes.push(byte);
    }
  }

  if (validBytes.length === 0) {
    return Effect.succeed("");
  }

  // Decode using TextDecoder with non-fatal errors
  try {
    const uint8Array = new Uint8Array(validBytes);
    // Use { fatal: false } to replace invalid sequences with �
    const decoder = new TextDecoder("utf8", { fatal: false });
    return Effect.succeed(decoder.decode(uint8Array));
  } catch (error) {
    log.error(error);
    return TextDecoderError.fail(error);
  }
}
