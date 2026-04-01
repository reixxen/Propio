import z from 'zod'

/**
 * Converts string representations of numbers to JavaScript number type using parseFloat().
 * @example
 * stringToNumber.decode("42.5");  // => 42.5
 * stringToNumber.encode(42.5);    // => "42.5"
 */
export const stringToNumber = z.codec(
  z.string().regex(z.regexes.number),
  z.number(),
  {
    decode: (str) => Number.parseFloat(str),
    encode: (num) => num.toString(),
  }
)

/**
 * Converts string representations of integers to JavaScript number type using parseInt().
 * @example
 * stringToInt.decode("42");  // => 42
 * stringToInt.encode(42);    // => "42"
 */
export const stringToInt = z.codec(
  z.string().regex(z.regexes.integer),
  z.int(),
  {
    decode: (str) => Number.parseInt(str, 10),
    encode: (num) => num.toString(),
  }
)

/**
 * Converts Unix timestamps (seconds since epoch) to JavaScript Date objects.
 * @example
 * epochSecondsToDate.decode(1705314600);  // => Date object
 * epochSecondsToDate.encode(new Date());  // => Unix timestamp in seconds
 */
export const epochSecondsToDate = z.codec(z.int().min(0), z.date(), {
  decode: (seconds) => new Date(seconds * 1000),
  encode: (date) => Math.floor(date.getTime() / 1000),
})

/**
 * Converts Unix timestamps (milliseconds since epoch) to JavaScript Date objects.
 * @example
 * epochMillisToDate.decode(1705314600000);  // => Date object
 * epochMillisToDate.encode(new Date());     // => Unix timestamp in milliseconds
 */
export const epochMillisToDate = z.codec(z.int().min(0), z.date(), {
  decode: (millis) => new Date(millis),
  encode: (date) => date.getTime(),
})

/**
 * Converts URL strings to JavaScript URL objects.
 * @example
 * stringToURL.decode("https://example.com/path");  // => URL object
 * stringToURL.encode(new URL("https://example.com"));  // => "https://example.com/"
 */
export const stringToURL = z.codec(z.url(), z.instanceof(URL), {
  decode: (urlString) => new URL(urlString),
  encode: (url) => url.href,
})
