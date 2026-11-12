import { hex } from '../../theme/color'

/** Composite solid CSS backgrounds from the component through its ancestors. */
export function componentBackground(element: HTMLElement) {
  const canvas = element.ownerDocument.createElement('canvas')
  canvas.width = canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  let rgb = [0, 0, 0],
    alpha = 0
  for (let node: HTMLElement | null = element; node && alpha < 0.999; node = node.parentElement) {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = getComputedStyle(node).backgroundColor
    context.fillRect(0, 0, 1, 1)
    const color = context.getImageData(0, 0, 1, 1).data
    const contribution = (color[3] / 255) * (1 - alpha)
    rgb = rgb.map((value, index) => value + color[index] * contribution)
    alpha += contribution
  }
  return hex(rgb.map((value) => value + 255 * (1 - alpha)))
}
