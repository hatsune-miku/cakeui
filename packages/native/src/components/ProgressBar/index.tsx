import { StyleSheet, View, type ViewProps } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export interface ProgressBarProps extends ViewProps {
  value: number
}
export function ProgressBar({ value, style, ...props }: ProgressBarProps) {
  const { colors } = useCakeTheme()
  const progress = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
  return (
    <View
      {...props}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { backgroundColor: colors.control }, style]}
    >
      <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
    </View>
  )
}
const styles = StyleSheet.create({
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
})
