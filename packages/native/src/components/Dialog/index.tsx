import type { ReactNode } from 'react'
import { Modal, type ModalProps, StyleSheet, Text, View } from 'react-native'

import { useCakeTheme } from '../CakeProvider'

export interface DialogProps extends Omit<ModalProps, 'children' | 'transparent'> {
  title: string
  children?: ReactNode
}
export function Dialog({ title, children, ...props }: DialogProps) {
  const { colors } = useCakeTheme()
  return (
    <Modal animationType="fade" {...props} transparent>
      <View style={[styles.backdrop, { backgroundColor: colors.backdrop }]}>
        <View
          accessibilityViewIsModal
          style={[styles.dialog, { backgroundColor: colors.popup, borderColor: colors.line }]}
        >
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>
          {children}
        </View>
      </View>
    </Modal>
  )
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 440, borderRadius: 14, borderWidth: 1, padding: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: '600' },
})
