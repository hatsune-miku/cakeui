import { StyleSheet, View, type ViewProps } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export interface CardProps extends ViewProps {
  padding?: 'none' | 'medium'
}
export function Card({ padding = 'medium', style, ...props }: CardProps) {
  const { colors } = useCakeTheme()
  return (
    <View
      {...props}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line, padding: padding === 'none' ? 0 : 16 },
        style,
      ]}
    />
  )
}
const styles = StyleSheet.create({ card: { borderRadius: 14, borderWidth: 1, gap: 12 } })
