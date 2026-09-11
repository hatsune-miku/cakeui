import type { ComponentPropsWithoutRef } from 'react'

export type IconName =
  | 'cake'
  | 'grid'
  | 'layers'
  | 'palette'
  | 'code'
  | 'search'
  | 'arrow'
  | 'plus'
  | 'check'
  | 'moon'
  | 'sun'
  | 'sliders'
  | 'box'
  | 'file'
  | 'download'
  | 'copy'
  | 'external'
  | 'menu'
  | 'chevron'
  | 'close'
  | 'terminal'
  | 'circle'
export interface IconProps extends ComponentPropsWithoutRef<'svg'> {
  name: IconName
  size?: number
}
const paths: Record<IconName, string> = {
  cake: 'M4 10h16v11H4z M4 15h16 M8 6v4 M16 6v4 M7 3h2 M15 3h2',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  layers: 'm12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5',
  palette:
    'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2a4 4 0 0 0 3-4c0-4-4-7-9-7z M7 8h.01 M12 6h.01 M17 9h.01 M6 13h.01',
  code: 'm8 7-5 5 5 5 m8-10 5 5-5 5 M14 4l-4 16',
  search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
  check: 'm5 12 4 4L19 6',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
  sliders: 'M4 6h7 M15 6h5 M4 12h2 M10 12h10 M4 18h10 M18 18h2 M11 3v6 M6 9v6 M14 15v6',
  box: 'm12 3 9 5v9l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v9 M7 5l9 5',
  file: 'M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h5',
  download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
  copy: 'M9 8h11v13H9z M15 8V3H4v13h5',
  external: 'M13 3h8v8 M21 3l-11 11 M9 3H3v18h18v-6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  chevron: 'm9 5 7 7-7 7',
  close: 'm6 6 12 12 M6 18 18 6',
  terminal: 'M3 4h18v16H3z m4 4 4 4-4 4 M13 16h4',
  circle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
}
export function Icon({ name, size = 18, ...props }: IconProps) {
  return (
    <svg
      className="demo-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  )
}
