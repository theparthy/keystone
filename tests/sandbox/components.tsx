/** @jsxRuntime classic */
/** @jsx jsx */

import {
  fields,
  ArrayField,
  ConditionalField,
  FormField,
  ComponentSchema,
  ChildField,
} from '@keystone-6/fields-document/component-blocks';
import { PreviewProps } from '@keystone-6/fields-document/src/DocumentEditor/component-blocks/api';
import {
  FormValueContentFromPreviewProps,
  NonChildFieldComponentSchema,
} from '@keystone-6/fields-document/src/DocumentEditor/component-blocks/form-from-preview';
import { jsx, Stack } from '@keystone-ui/core';
import { AlertDialog } from '@keystone-ui/modals';
import { ButtonHTMLAttributes, useCallback, useEffect, useState, useRef } from 'react';
import {
  OrderableItem,
  OrderableList,
  DragHandle,
} from '@keystone-6/fields-document/src/DocumentEditor/primitives/orderable';
import { AddButton } from './add-button';

type ComponentSchemaWithoutChildField = Exclude<ComponentSchema, ChildField>;

type ComponentsFields<Components extends Record<string, ComponentSchemaWithoutChildField>> =
  ArrayField<
    ConditionalField<
      FormField<keyof Components & string, readonly { value: keyof Components; label: string }[]>,
      Components
    >
  >;

const returnUndefined = () => undefined;

function components<
  Components extends {
    [Key in keyof Components]: {
      label: string;
      schema: ComponentSchemaWithoutChildField;
      subtitle?: (props: PreviewProps<Components[Key]['schema']>) => string | undefined;
      children?: (
        props: PreviewProps<Components[Key]['schema']>
      ) => PreviewProps<ComponentSchemaWithoutChildField> | undefined;
    };
  }
>(
  components: Components
): ComponentsFields<{
  [Key in keyof Components]: Components[Key]['schema'];
}> {
  const comps = components as unknown as Record<
    string,
    {
      label: string;
      schema: ComponentSchemaWithoutChildField;
      subtitle?: (props: PreviewProps<ComponentSchemaWithoutChildField>) => string | undefined;
      children?: (
        props: PreviewProps<ComponentSchemaWithoutChildField>
      ) => PreviewProps<ComponentSchemaWithoutChildField> | undefined;
    }
  >;
  const labels = new Map(Object.entries(comps).map(([key, { label }]) => [key, label]));
  const field = fields.array(
    fields.conditional(
      fields.select({
        label: 'Type',
        options: Object.entries(comps).map(([value, { label }]) => ({
          value: value,
          label,
        })),
        defaultValue: Object.keys(comps)[0],
      }),
      Object.fromEntries(Object.entries(comps).map(([value, { schema: field }]) => [value, field]))
    ),
    {
      preview: function Preview(props) {
        const elementsRef = useRef(props.elements);
        useEffect(() => {
          elementsRef.current = props.elements;
        });
        const { onChange } = props;
        const onRemove = useCallback(
          (id: string) => {
            onChange(elementsRef.current.filter(x => x.key !== id).map(x => ({ key: x.key })));
          },
          [onChange]
        );
        const onInsert = useCallback(
          (initialValue: { discriminant: string }) => {
            onChange([
              ...elementsRef.current.map(x => ({ key: x.key })),
              {
                key: undefined,
                value: { discriminant: initialValue.discriminant },
              },
            ]);
          },
          [onChange]
        );
        return (
          <Stack gap="medium">
            {!!props.elements.length && (
              <OrderableList {...props}>
                {props.elements.map(x => {
                  return (
                    <DraggableElement<typeof x['value']['schema']>
                      key={x.key}
                      elementKey={x.key}
                      props={x.value}
                      label={labels.get(x.discriminant)!}
                      children={comps[x.discriminant].children ?? returnUndefined}
                      subtitle={comps[x.discriminant].subtitle ?? returnUndefined}
                      onRemove={onRemove}
                    />
                  );
                })}
              </OrderableList>
            )}
            <AddButton options={props.schema.element.discriminant.options} onInsert={onInsert} />
          </Stack>
        );
      },
    }
  );
  return field as any;
}

function componentThing<Schema extends ComponentSchemaWithoutChildField>(component: {
  label: string;
  schema: Schema;
  subtitle?: (props: PreviewProps<Schema>) => string | undefined;
  children?: (
    props: PreviewProps<Schema>
  ) => PreviewProps<ComponentSchemaWithoutChildField> | undefined;
}) {
  return component;
}

export const prop: ArrayField<ComponentSchemaWithoutChildField> = components({
  leaf: componentThing({
    label: 'Leaf',
    schema: fields.object({
      label: fields.text({ label: 'Label' }),
      url: fields.url({ label: 'URL' }),
    }),
    subtitle: props => props.fields.label.value,
  }),
  group: componentThing({
    label: 'Group',
    schema: fields.object({
      label: fields.text({ label: 'Label' }),
      get children() {
        return prop;
      },
    }),
    subtitle: props =>
      `${props.fields.label.value ? props.fields.label.value + ' — ' : ''}${
        props.fields.children.elements.length
      } Items`,
    children: props => props.fields.children,
  }),
});

const DraggableElement = function DraggableElement<
  Schema extends NonChildFieldComponentSchema
>(props: {
  props: PreviewProps<Schema>;
  elementKey: string;
  label: string;
  subtitle: (props: PreviewProps<Schema>) => string | undefined;
  children: (
    props: PreviewProps<Schema>
  ) => PreviewProps<ComponentSchemaWithoutChildField> | undefined;
  onRemove: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isChildrenOpen, setIsChildrenOpen] = useState(true);
  const childrenProps = props.children(props.props);
  return (
    <OrderableItem elementKey={props.elementKey}>
      <Stack gap="medium">
        <div css={{ display: 'flex', gap: 4 }}>
          <Stack across gap="xsmall" align="center" css={{ cursor: 'pointer' }}>
            <DragHandle />
            <div
              css={{
                background: '#F6F8FC',
                border: '1px solid #E9EBF3',
                height: 32,
                width: 32,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 4,
              }}
            >
              {props.label.slice(0, 2)}
            </div>
          </Stack>
          <button
            css={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              cursor: 'pointer',
              backgroundColor: 'transparent',
              ':hover': {
                backgroundColor: '#F6F8FC',
              },
              borderRadius: 8,
            }}
            onClick={() => {
              setIsEditing(true);
            }}
          >
            <span css={{ fontSize: 16, fontWeight: 'bold' }}>{props.label}</span>
            <span css={{ fontSize: 12 }}>{props.subtitle(props.props)}</span>
          </button>
          <Stack across gap="xsmall" align="center">
            {/* <IconButton
              onClick={() => {
                setIsEditing(true);
              }}
            >
              {editIcon}
            </IconButton> */}
            <IconButton
              onClick={() => {
                props.onRemove(props.elementKey);
              }}
            >
              {removeIcon}
            </IconButton>
            {childrenProps && (
              <Stack across gap="xsmall" align="center">
                <div css={{ width: 1, height: 28, backgroundColor: '#E9EBF3' }} />
                <IconButton
                  aria-label={`${isChildrenOpen ? 'Close' : 'Open'} ${props.label} children`}
                  onClick={() => {
                    setIsChildrenOpen(!isChildrenOpen);
                  }}
                  style={isChildrenOpen ? {} : { transform: 'rotate(180deg)' }}
                >
                  {downChevron}
                </IconButton>
              </Stack>
            )}
          </Stack>
        </div>
        {isChildrenOpen && childrenProps !== undefined && (
          <FormValueContentFromPreviewProps {...childrenProps} />
        )}
        <AlertDialog
          title={`Edit ${props.label}`}
          actions={{
            confirm: {
              action: () => {
                setIsEditing(false);
              },
              label: 'Done',
            },
          }}
          isOpen={isEditing}
        >
          <FormValueContentFromPreviewProps {...props.props} />
        </AlertDialog>
      </Stack>
    </OrderableItem>
  );
};

function IconButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      css={{
        border: '0',
        background: 'transparent',
        cursor: 'pointer',
        ':hover,:focus': {
          background: '#F6F8FC',
        },
        borderRadius: 8,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 28,
        width: 28,
      }}
      {...props}
    />
  );
}

const removeIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.75 1.125H11.25V2.25H6.75V1.125ZM2.25 3.375V4.5H3.375V15.75C3.375 16.0484 3.49353 16.3345 3.7045 16.5455C3.91548 16.7565 4.20163 16.875 4.5 16.875H13.5C13.7984 16.875 14.0845 16.7565 14.2955 16.5455C14.5065 16.3345 14.625 16.0484 14.625 15.75V4.5H15.75V3.375H2.25ZM4.5 15.75V4.5H13.5V15.75H4.5ZM6.75 6.75H7.875V13.5H6.75V6.75ZM10.125 6.75H11.25V13.5H10.125V6.75Z"
      fill="#596794"
    />
  </svg>
);

const downChevron = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10 13.75L3.75 7.5L4.625 6.625L10 12L15.375 6.625L16.25 7.5L10 13.75Z"
      fill="#596794"
    />
  </svg>
);
