import { expect, it } from "vitest";
import { strip } from "../src";

it("replace comments with whitespace", () => {
  expect(strip("//comment\n{\"a\":\"b\"}")).toBe("         \n{\"a\":\"b\"}");
  expect(strip("/*//comment*/{\"a\":\"b\"}")).toBe("             {\"a\":\"b\"}");
  expect(strip("{\"a\":\"b\"//comment\n}")).toBe("{\"a\":\"b\"         \n}");
  expect(strip("{\"a\":\"b\"/*comment*/}")).toBe("{\"a\":\"b\"           }");
  expect(strip("{\"a\"/*\n\n\ncomment\r\n*/:\"b\"}")).toBe("{\"a\"  \n\n\n       \r\n  :\"b\"}");
  expect(strip("/*!\n * comment\n */\n{\"a\":\"b\"}")).toBe("   \n          \n   \n{\"a\":\"b\"}");
  expect(strip("{/*comment*/\"a\":\"b\"}")).toBe("{           \"a\":\"b\"}");
});

it("remove comments", () => {
  const options = { whitespace: false };

  expect(strip("//comment\n{\"a\":\"b\"}", options)).toBe("\n{\"a\":\"b\"}");
  expect(strip("/*//comment*/{\"a\":\"b\"}", options)).toBe("{\"a\":\"b\"}");
  expect(strip("{\"a\":\"b\"//comment\n}", options)).toBe("{\"a\":\"b\"\n}");
  expect(strip("{\"a\":\"b\"/*comment*/}", options)).toBe("{\"a\":\"b\"}");
  expect(strip("{\"a\"/*\n\n\ncomment\r\n*/:\"b\"}", options)).toBe("{\"a\":\"b\"}");
  expect(strip("/*!\n * comment\n */\n{\"a\":\"b\"}", options)).toBe("\n{\"a\":\"b\"}");
  expect(strip("{/*comment*/\"a\":\"b\"}", options)).toBe("{\"a\":\"b\"}");
});

it("doesn't strip comments inside strings", () => {
  expect(strip("{\"a\":\"b//c\"}")).toBe("{\"a\":\"b//c\"}");
  expect(strip("{\"a\":\"b/*c*/\"}")).toBe("{\"a\":\"b/*c*/\"}");
  expect(strip("{\"/*a\":\"b\"}")).toBe("{\"/*a\":\"b\"}");
  expect(strip("{\"\\\"/*a\":\"b\"}")).toBe("{\"\\\"/*a\":\"b\"}");
});

it("consider escaped slashes when checking for escaped string quote", () => {
  expect(strip("{\"\\\\\":\"https://foobar.com\"}")).toBe("{\"\\\\\":\"https://foobar.com\"}");
  expect(strip("{\"foo\\\"\":\"https://foobar.com\"}")).toBe("{\"foo\\\"\":\"https://foobar.com\"}");
});

it("line endings - no comments", () => {
  expect(strip("{\"a\":\"b\"\n}")).toBe("{\"a\":\"b\"\n}");
  expect(strip("{\"a\":\"b\"\r\n}")).toBe("{\"a\":\"b\"\r\n}");
});

it("line endings - single line comment", () => {
  expect(strip("{\"a\":\"b\"//c\n}")).toBe("{\"a\":\"b\"   \n}");
  expect(strip("{\"a\":\"b\"//c\r\n}")).toBe("{\"a\":\"b\"   \r\n}");
});

it("line endings - single line block comment", () => {
  expect(strip("{\"a\":\"b\"/*c*/\n}")).toBe("{\"a\":\"b\"     \n}");
  expect(strip("{\"a\":\"b\"/*c*/\r\n}")).toBe("{\"a\":\"b\"     \r\n}");
});

it("line endings - multi line block comment", () => {
  expect(strip("{\"a\":\"b\",/*c\nc2*/\"x\":\"y\"\n}")).toBe("{\"a\":\"b\",   \n    \"x\":\"y\"\n}");
  expect(strip("{\"a\":\"b\",/*c\r\nc2*/\"x\":\"y\"\r\n}")).toBe("{\"a\":\"b\",   \r\n    \"x\":\"y\"\r\n}");
});

it("line endings - works at EOF", () => {
  const options = { whitespace: false };
  expect(strip("{\r\n\t\"a\":\"b\"\r\n} //EOF")).toBe("{\r\n\t\"a\":\"b\"\r\n}      ");
  expect(strip("{\r\n\t\"a\":\"b\"\r\n} //EOF", options)).toBe("{\r\n\t\"a\":\"b\"\r\n} ");
});

it("handles weird escaping", () => {
  expect(strip(String.raw`{"x":"x \"sed -e \\\"s/^.\\\\{46\\\\}T//\\\" -e \\\"s/#033/\\\\x1b/g\\\"\""}`)).toBe(String.raw`{"x":"x \"sed -e \\\"s/^.\\\\{46\\\\}T//\\\" -e \\\"s/#033/\\\\x1b/g\\\"\""}`);
});

it("strips trailing commas", () => {
  expect(strip("{\"x\":true,}", { trailingCommas: true })).toBe("{\"x\":true }");
  expect(strip("{\"x\":true,}", { trailingCommas: true, whitespace: false })).toBe("{\"x\":true}");
  expect(strip("{\"x\":true,\n  }", { trailingCommas: true })).toBe("{\"x\":true \n  }");
  expect(strip("[true, false,]", { trailingCommas: true })).toBe("[true, false ]");
  expect(strip("[true, false,]", { trailingCommas: true, whitespace: false })).toBe("[true, false]");
  expect(strip("{\n  \"array\": [\n    true,\n    false,\n  ],\n}", { trailingCommas: true, whitespace: false })).toBe("{\n  \"array\": [\n    true,\n    false\n  ]\n}");
  expect(strip("{\n  \"array\": [\n    true,\n    false /* comment */ ,\n /*comment*/ ],\n}", { trailingCommas: true, whitespace: false })).toBe("{\n  \"array\": [\n    true,\n    false  \n  ]\n}");
});

it("handles malformed block comments", () => {
  expect(strip("[] */")).toBe("[] */");
  expect(strip("[] /*")).toBe("[] /*"); // Fails
});

it("handles non-breaking space with preserving whitespace", () => {
  const fixture = `{
  // Comment with non-breaking-space: '\u00A0'
  "a": 1
  }`;

  const stripped = strip(fixture);
  expect(JSON.parse(stripped)).toEqual({ a: 1 });
});
