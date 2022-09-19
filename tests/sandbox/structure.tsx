import { ComponentSchemaForGraphQL, fields } from '@keystone-6/fields-document/component-blocks';

export const schema: ComponentSchemaForGraphQL = fields.array(
  fields.conditional(
    fields.select({
      label: 'Type',
      defaultValue: 'leaf',
      options: [
        { label: 'Group', value: 'group' },
        { label: 'Leaf', value: 'leaf' },
      ],
    }),
    {
      leaf: fields.object({
        label: fields.text({ label: 'Label' }),
        href: fields.text({ label: 'Link' }),
      }),
      group: fields.object({
        label: fields.text({ label: 'Label' }),
        get children() {
          return schema;
        },
      }),
    }
  )
);
