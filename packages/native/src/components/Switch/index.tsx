import { Switch as NativeSwitch, type SwitchProps as NativeSwitchProps } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export type SwitchProps = NativeSwitchProps
export function Switch(props: SwitchProps) {
  const { colors } = useCakeTheme()
  return <NativeSwitch trackColor={{ false: colors.controlHover, true: colors.accent }} {...props} />
}
