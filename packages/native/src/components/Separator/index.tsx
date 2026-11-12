import { StyleSheet, View, type ViewProps } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export type SeparatorProps = ViewProps
export function Separator({ style, ...props }: SeparatorProps) {
  const { colors } = useCakeTheme()
  return <View {...props} style={[styles.line, { backgroundColor: colors.line }, style]} />
}
const styles = StyleSheet.create({ line: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' } })
