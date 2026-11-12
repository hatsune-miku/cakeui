import type { ReactNode } from 'react'
import { Pressable, type PressableProps, StyleSheet, Text, View } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export interface CheckBoxProps extends Omit<PressableProps, 'children' | 'onPress'> {
  checked: boolean
  onValueChange?: (checked: boolean) => void
  children?: ReactNode
}
export function CheckBox({ checked, onValueChange, children, style, disabled, ...props }: CheckBoxProps) {
  const { colors } = useCakeTheme()
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      onPress={() => onValueChange?.(!checked)}
      style={(state) => [
        styles.row,
        { opacity: disabled ? 0.45 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? colors.accent : colors.control,
            borderColor: checked ? colors.accent : colors.line,
          },
        ]}
      >
        {checked && <Text style={{ color: colors.primaryInk, fontSize: 14 }}>✓</Text>}
      </View>
      {children != null && <Text style={[styles.label, { color: colors.text }]}>{children}</Text>}
    </Pressable>
  )
}
const styles = StyleSheet.create({
  row: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { height: 22, width: 22, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, flexShrink: 1 },
})
