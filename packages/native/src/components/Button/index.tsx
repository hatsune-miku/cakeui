import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, Text } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export interface ButtonProps extends PressableProps {
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  loading?: boolean
}
export function Button({
  variant = 'default',
  loading = false,
  disabled,
  style,
  children,
  accessibilityState,
  ...props
}: ButtonProps) {
  const { colors } = useCakeTheme()
  const inactive = disabled || loading
  const ink = variant === 'primary' ? colors.primaryInk : variant === 'danger' ? colors.danger : colors.text
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: inactive, busy: loading }}
      disabled={inactive}
      style={(state) => [
        styles.button,
        {
          opacity: inactive ? 0.45 : 1,
          borderColor: variant === 'ghost' ? 'transparent' : colors.line,
          backgroundColor:
            variant === 'primary'
              ? state.pressed
                ? colors.accentHover
                : colors.accent
              : variant === 'ghost'
                ? state.pressed
                  ? colors.control
                  : 'transparent'
                : state.pressed
                  ? colors.controlHover
                  : colors.control,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {(state) => (
        <>
          {loading && <ActivityIndicator color={ink} size="small" />}
          <Text style={[styles.label, { color: ink }]}>
            {typeof children === 'function' ? children(state) : children}
          </Text>
        </>
      )}
    </Pressable>
  )
}
const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'center' },
})
