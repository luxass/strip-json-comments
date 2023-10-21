const singleComment = Symbol("singleComment");
const multiComment = Symbol("multiComment");

export interface Options {
  /**
   * Strip trailing commas in addition to comments.
   *
   * @default false
   */
  readonly trailingCommas?: boolean

  /**
   * Replace comments and trailing commas with whitespace instead of stripping them entirely.
   *
   * @default true
   */
  readonly whitespace?: boolean
}

function stripWithoutWhitespace() {
  return "";
}

function stripWithWhitespace(str: string, start?: number, end?: number) {
  return str.slice(start, end).replace(/\S/g, " ");
}

function isEscaped(jsonString: string, quotePosition: number) {
  let index = quotePosition - 1;
  let backslashCount = 0;

  while (jsonString[index] === "\\") {
    index -= 1;
    backslashCount += 1;
  }

  return Boolean(backslashCount % 2);
}

export const DEFAULT_OPTIONS = {
  trailingCommas: false,
  whitespace: true,
} satisfies Options;

/**
 * Strip comments from JSON. Lets you use comments in your JSON files!
 * @param {string} jsonString - The JSON string to strip comments from
 * @param {Options} options - The options to use
 * @returns {string} A JSON string without comments.
 *
 * @example
 * ```
 * import { strip } from "@luxass/strip-json-comments";
 *
 * const json = `{
 *   // this is a comment
 *   "foo": "bar"
 * }`;
 * JSON.parse(strip(json)); // { foo: "bar" }
 * ```
 */
export function strip(jsonString: string, options: Options = DEFAULT_OPTIONS): string {
  if (typeof jsonString !== "string") {
    throw new TypeError(`Expected argument \`jsonString\` to be a \`string\`, got \`${typeof jsonString}\``);
  }

  const { trailingCommas = false, whitespace = true } = options;

  const _strip = whitespace ? stripWithWhitespace : stripWithoutWhitespace;

  let isInsideString = false;
  let isInsideComment: symbol | boolean = false;
  let offset = 0;
  let buffer = "";
  let result = "";
  let commaIndex = -1;

  for (let i = 0; i < jsonString.length; i++) {
    const currentCharacter = jsonString[i];
    const nextCharacter = jsonString[i + 1];

    if (!currentCharacter) {
      continue;
    }

    if (!isInsideComment && currentCharacter === "\"") {
      // Enter or exit string
      const escaped = isEscaped(jsonString, i);
      if (!escaped) {
        isInsideString = !isInsideString;
      }
    }

    if (isInsideString) {
      continue;
    }

    if (!isInsideComment && currentCharacter + nextCharacter === "//") {
      // Enter single-line comment
      buffer += jsonString.slice(offset, i);
      offset = i;
      isInsideComment = singleComment;
      i++;
    } else if (isInsideComment === singleComment && currentCharacter + nextCharacter === "\r\n") {
      // Exit single-line comment via \r\n
      i++;
      isInsideComment = false;
      buffer += _strip(jsonString, offset, i);
      offset = i;
      continue;
    } else if (isInsideComment === singleComment && currentCharacter === "\n") {
      // Exit single-line comment via \n
      isInsideComment = false;
      buffer += _strip(jsonString, offset, i);
      offset = i;
    } else if (!isInsideComment && currentCharacter + nextCharacter === "/*") {
      // Enter multiline comment
      buffer += jsonString.slice(offset, i);
      offset = i;
      isInsideComment = multiComment;
      i++;
      continue;
    } else if (isInsideComment === multiComment && currentCharacter + nextCharacter === "*/") {
      // Exit multiline comment
      i++;
      isInsideComment = false;
      buffer += _strip(jsonString, offset, i + 1);
      offset = i + 1;
      continue;
    } else if (trailingCommas && !isInsideComment) {
      if (commaIndex !== -1) {
        if (currentCharacter === "}" || currentCharacter === "]") {
          // Strip trailing comma
          buffer += jsonString.slice(offset, i);
          result += _strip(buffer, 0, 1) + buffer.slice(1);
          buffer = "";
          offset = i;
          commaIndex = -1;
        } else if (currentCharacter !== " " && currentCharacter !== "\t" && currentCharacter !== "\r" && currentCharacter !== "\n") {
          // Hit non-whitespace following a comma; comma is not trailing
          buffer += jsonString.slice(offset, i);
          offset = i;
          commaIndex = -1;
        }
      } else if (currentCharacter === ",") {
        // Flush buffer prior to this point, and save new comma index
        result += buffer + jsonString.slice(offset, i);
        buffer = "";
        offset = i;
        commaIndex = i;
      }
    }
  }

  return result + buffer + (isInsideComment ? _strip(jsonString.slice(offset)) : jsonString.slice(offset));
}
