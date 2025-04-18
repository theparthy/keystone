import { type ReactNode, useState } from 'react'
import { type RenderLeafProps } from 'slate-react'
import { InsertMenu } from './insert-menu'
import { css } from '@keystar/ui/style'

function Placeholder({ placeholder, children }: { placeholder: string; children: ReactNode }) {
  const [width, setWidth] = useState(0)
  return (
    <span className={css({ position: 'relative', display: 'inline-block', width })}>
      <span
        contentEditable={false}
        className={css({
          position: 'absolute',
          pointerEvents: 'none',
          display: 'inline-block',
          left: 0,
          top: 0,
          maxWidth: '100%',
          whiteSpace: 'nowrap',
          opacity: '0.5',
          userSelect: 'none',
          fontStyle: 'normal',
          fontWeight: 'normal',
          textDecoration: 'none',
          textAlign: 'left',
        })}
      >
        <span
          ref={node => {
            if (node) {
              const offsetWidth = node.offsetWidth
              if (offsetWidth !== width) {
                setWidth(offsetWidth)
              }
            }
          }}
        >
          {placeholder}
        </span>
      </span>
      {children}
    </span>
  )
}

const Leaf = ({ leaf, text, children, attributes }: RenderLeafProps) => {
  const {
    underline,
    strikethrough,
    bold,
    italic,
    code,
    keyboard,
    superscript,
    subscript,
    placeholder,
    insertMenu,
  } = leaf

  if (placeholder !== undefined) {
    children = <Placeholder placeholder={placeholder}>{children}</Placeholder>
  }

  if (insertMenu) {
    children = <InsertMenu text={text}>{children}</InsertMenu>
  }

  if (code) {
    children = <code>{children}</code>
  }
  if (bold) {
    children = <strong>{children}</strong>
  }
  if (strikethrough) {
    children = <s>{children}</s>
  }
  if (italic) {
    children = <em>{children}</em>
  }
  if (keyboard) {
    children = <kbd>{children}</kbd>
  }
  if (superscript) {
    children = <sup>{children}</sup>
  }
  if (subscript) {
    children = <sub>{children}</sub>
  }
  if (underline) {
    children = <u>{children}</u>
  }
  return <span {...attributes}>{children}</span>
}

export const renderLeaf = (props: RenderLeafProps) => {
  return <Leaf {...props} />
}
