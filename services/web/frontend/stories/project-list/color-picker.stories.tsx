import { ColorPicker } from '../../js/features/project-list/components/color-picker/color-picker'
import { ColorPickerProvider } from '../../js/features/project-list/context/color-picker-context'

export const Select = (args: any) => {
  window.metaAttributesCache = new Map()

  return (
    <ColorPickerProvider>
      <ColorPicker {...args} />
    </ColorPickerProvider>
  )
}

export default {
  title: 'Project List / Color Picker',
  component: ColorPicker,
}
