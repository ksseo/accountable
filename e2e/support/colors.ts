// What an SVG is drawn with, against the colors in tokens.css (LOOK-3). Recharts
// picks grays of its own for whatever it isn't given a color for.
import type { Locator } from '@playwright/test'

/** What's drawn in a color no token has, such as "rect stroke rgb(204, 204, 204)". */
export function strayColors(svg: Locator): Promise<string[]> {
  return svg.evaluate((root) => {
    const names = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter((rule) => rule instanceof CSSStyleRule && rule.selectorText.startsWith(':root'))
      .flatMap((rule) => [...(rule as CSSStyleRule).style])
      .filter((name) => name.startsWith('--'))

    // As the browser writes them, so they can be compared with what's drawn.
    const probe = document.body.appendChild(document.createElement('i'))
    const tokens = new Set(
      names.map((name) => {
        probe.style.color = `var(${name})`
        return getComputedStyle(probe).color
      }),
    )
    probe.remove()

    // An upright or level line has no inside, so its fill isn't drawn.
    const hasInside = (shape: SVGGraphicsElement) => {
      const { width, height } = shape.getBBox()
      return width > 0 && height > 0
    }

    const stray = [...root.querySelectorAll<SVGGraphicsElement>('path, rect, circle, line, text, tspan')]
      .filter((shape) => !shape.closest('defs, clipPath'))
      .flatMap((shape) =>
        (hasInside(shape) ? ['fill', 'stroke'] : ['stroke'])
          .map((property) => ({ property, color: getComputedStyle(shape).getPropertyValue(property) }))
          .filter(({ color }) => color !== 'none' && !tokens.has(color))
          .map(({ property, color }) => `${shape.tagName} ${property} ${color}`),
      )
    return [...new Set(stray)]
  })
}
