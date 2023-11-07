import OutlinePane from '../js/features/outline/components/outline-pane'
import { ScopeDecorator } from './decorators/scope'

export const Basic = args => <OutlinePane {...args} />
Basic.args = {
  outline: [{ line: 1, title: 'Hello', level: 1 }],
}

export const Nested = args => <OutlinePane {...args} />
Nested.args = {
  outline: [
    {
      line: 1,
      title: 'Section',
      level: 1,
      children: [
        {
          line: 2,
          title: 'Subsection',
          level: 2,
          children: [
            {
              line: 3,
              title: 'Subsubsection',
              level: 3,
            },
          ],
        },
      ],
    },
  ],
}

export const NoSections = args => <OutlinePane {...args} />
NoSections.args = {}

export const NonTexFile = args => <OutlinePane {...args} />
NonTexFile.args = {
  isTexFile: false,
}

export const PartialResult = args => <OutlinePane {...args} />
PartialResult.args = {
  isPartial: true,
}

export default {
  title: 'Editor / Outline',
  component: OutlinePane,
  argTypes: {
    jumpToLine: { action: 'jumpToLine' },
  },
  args: {
    eventTracking: { sendMB: () => {} },
    isTexFile: true,
    outline: [],
    jumpToLine: () => {},
    onToggle: () => {},
    show: true,
  },
  decorators: [ScopeDecorator],
}
