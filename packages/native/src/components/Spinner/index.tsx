import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export type SpinnerProps = ActivityIndicatorProps
export function Spinner(props: SpinnerProps) {
  const { colors } = useCakeTheme()
  return <ActivityIndicator color={colors.accent} {...props} />
}
