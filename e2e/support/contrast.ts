// The contrast of text drawn in SVG, which axe can't judge (TEST-4): its color
// against everything drawn behind it, such as a bar, a grid line or the faint
// area under a line.
import type { Locator } from '@playwright/test'

/** A color as the browser gives it, "rgb(...)" or "rgba(...)", and the opacity it's drawn with. */
type Paint = { color: string; opacity: number }
/** A piece of text, and what's drawn behind it at points all over its box, lowest first. */
type DrawnText = { text: string; paint: Paint; behind: Paint[][] }
type Rgb = [number, number, number]

/** Every piece of text in an SVG, with its lowest contrast with what's behind it. */
export async function textContrasts(svg: Locator): Promise<{ text: string; contrast: number }[]> {
  const texts = await svg.evaluate(findTexts)
  return texts.map(({ text, paint, behind }) => ({
    text,
    contrast: Math.min(
      ...behind.map((paints) => {
        const background = paints.reduce<Rgb>(draw, [255, 255, 255])
        return contrastRatio(draw(background, paint), background)
      }),
    ),
  }))
}

/** Runs in the page, so everything it needs is inside it. */
function findTexts(svg: Element): DrawnText[] {
  const STEP = 2
  const shapes = [...svg.querySelectorAll<SVGGeometryElement>('path, rect, circle, line')].filter(
    (shape) => !shape.closest('defs, clipPath'),
  )

  const paintOf = (element: Element, property: 'fill' | 'stroke'): Paint => {
    const style = getComputedStyle(element)
    let opacity = Number(style.getPropertyValue(`${property}-opacity`))
    for (let at: Element = element; at !== svg; at = at.parentElement!) {
      opacity *= Number(getComputedStyle(at).opacity)
    }
    return { color: style.getPropertyValue(property), opacity }
  }

  const paintsAt = (shape: SVGGeometryElement, x: number, y: number): Paint[] => {
    const point = new DOMPoint(x, y).matrixTransform(shape.getScreenCTM()!.inverse())
    const fill = shape.isPointInFill(point) ? [paintOf(shape, 'fill')] : []
    const stroke = shape.isPointInStroke(point) ? [paintOf(shape, 'stroke')] : []
    return [...fill, ...stroke].filter((paint) => paint.color !== 'none')
  }

  const backgrounds: Paint[] = []
  for (let at: Element | null = svg; at; at = at.parentElement) {
    backgrounds.unshift({ color: getComputedStyle(at).backgroundColor, opacity: 1 })
  }

  const meets = (a: DOMRect, b: DOMRect) =>
    a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top

  return [...svg.querySelectorAll('text, tspan')]
    .filter((element) => [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE))
    .map((element) => {
      const box = element.getBoundingClientRect()
      const earlier = shapes.filter(
        (shape) =>
          shape.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING &&
          meets(shape.getBoundingClientRect(), box),
      )
      // An outline drawn under the letters is what surrounds them.
      const outlined = getComputedStyle(element).paintOrder.startsWith('stroke')
      const outline = outlined ? [paintOf(element, 'stroke')] : []
      const behind: Paint[][] = []
      for (let x = box.left; x <= box.right; x += STEP) {
        for (let y = box.top; y <= box.bottom; y += STEP) {
          behind.push([...backgrounds, ...earlier.flatMap((shape) => paintsAt(shape, x, y)), ...outline])
        }
      }
      return { text: element.textContent, paint: paintOf(element, 'fill'), behind }
    })
}

/** A color with another drawn over it. */
function draw(below: Rgb, { color, opacity }: Paint): Rgb {
  const parts = color.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/)
  if (!parts) throw new Error(`Not a color this can work with: ${color}`)
  const alpha = Number(parts[4] ?? 1) * opacity
  const mix = (index: number) => Number(parts[index + 1]) * alpha + below[index] * (1 - alpha)
  return [mix(0), mix(1), mix(2)]
}

/** WCAG 2.1's contrast ratio. */
function contrastRatio(one: Rgb, other: Rgb): number {
  const [darker, lighter] = [luminance(one), luminance(other)].sort((a, b) => a - b)
  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(color: Rgb): number {
  const [red, green, blue] = color.map((value) => {
    const share = value / 255
    return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}
