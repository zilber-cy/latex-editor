import EditorSwitch from '../js/features/source-editor/components/editor-switch-legacy'
import { ScopeDecorator } from './decorators/scope'

export default {
  title: 'Editor / Switch',
  component: EditorSwitch,
  decorators: [ScopeDecorator],
}

export const Switcher = () => {
  return <EditorSwitch />
}
