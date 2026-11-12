/** Inline strokes for built-in controls: text glyphs such as × and › vary too much between fonts. */
export interface GlyphProps {
  size?: number
}
export function CloseGlyph({ size = 12 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
export interface ChevronGlyphProps extends GlyphProps {
  direction: 'left' | 'right'
}
export function ChevronGlyph({ direction, size = 12 }: ChevronGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
      <path
        d={direction === 'left' ? 'M7.5 2.5 4 6l3.5 3.5' : 'M4.5 2.5 8 6l-3.5 3.5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
