// Avatar colors: white initials stay readable on each, in light and dark themes.
export const AVATAR_COLORS = [
  '#D9480F', // orange
  '#1971C2', // blue
  '#7048E8', // violet
  '#2B8A3E', // green
  '#C2255C', // pink
  '#0B7285', // teal
  '#A61E4D', // berry
  '#5F3DC4', // indigo
  '#E67700', // amber
  '#495057', // slate
]

export const avatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length]

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
