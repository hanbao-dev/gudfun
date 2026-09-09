import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { SegmentRenderer } from "../src/components/segment-renderer"

test("unknown types and invalid video data render a safe fallback", () => {
  for (const [type, configuration] of [
    ["unknown", { html: "<script>bad()</script>" }],
    ["introVideo", { url: "javascript:bad()" }],
    ["introVideo", {}],
  ] as const) {
    const html = renderToStaticMarkup(
      <SegmentRenderer type={type} configuration={configuration} />
    )
    expect(html).toContain("This segment is unavailable")
    expect(html).not.toContain("<video")
    expect(html).not.toContain("<script")
    expect(html).not.toContain("javascript:")
  }
})
test("configured video uses native controls without requiring autoplay", () => {
  const html = renderToStaticMarkup(
    <SegmentRenderer
      type="introVideo"
      configuration={{ url: "https://example.com/intro.mp4" }}
    />
  )
  expect(html).toContain("<video")
  expect(html).toContain('controls=""')
  expect(html).toContain('src="https://example.com/intro.mp4"')
  expect(html).not.toContain("autoplay")
})
