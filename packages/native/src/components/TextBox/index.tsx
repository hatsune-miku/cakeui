import { useState } from 'react'
import { StyleSheet, TextInput, type TextInputProps } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export interface TextBoxProps extends TextInputProps {
  invalid?: boolean
}
export function TextBox({ invalid = false, style, onFocus, onBlur, ...props }: TextBoxProps) {
  const { colors } = useCakeTheme()
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      selectionColor={colors.accent}
      {...props}
      onFocus={(event) => {
        setFocused(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        onBlur?.(event)
      }}
      style={[
        styles.input,
        {
          color: colors.text,
          backgroundColor: colors.control,
          borderColor: invalid ? colors.danger : focused ? colors.accent : colors.line,
        },
        style,
      ]}
    />
  )
}
const styles = StyleSheet.create({
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
})
