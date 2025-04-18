---
title: "Custom Admin UI Navigation"
description: "In this guide, we'll show you how to create a custom Navigation component to be rendered in the Admin UI."
---

In this guide, we'll show you how to create a custom Navigation component to be rendered in the Admin UI.

{% hint kind="tip" %}
By the end of this guide you should have a custom Navigation component rendering in the Admin UI with a custom route pointing to the KeystoneJS docs.
![finished custom navigation example](/assets/guides/custom-admin-ui-navigation/final-result.png)
{% /hint %}

## Adding the custom navigation component to the Admin UI

The first thing you'll need to do is to specify an `/admin/config.ts` file in the root of your Keystone project.

Reference your custom Navigation component in the export as so.

```ts
// /admin/config.ts
import type { AdminConfig } from '@keystone-6/core/types'
import { CustomNavigation } from './components/CustomNavigation'

export const components: AdminConfig['components'] = {
  Navigation: CustomNavigation
}
```

## Creating your custom Navigation component

The next step is to create our `CustomNavigation` React component.
In the root of your project create a new tsx file at `/admin/components/CustomNavigation.tsx`.

Here we'll export our `CustomNavigation` component as a named export.

```tsx
// admin/components/CustomNavigation.tsx

import type { NavigationProps } from '@keystone-6/core/admin-ui/components'
export function CustomNavigation({ lists }: NavigationProps) {
  return (
    {/* ... */}
  )
}
```

Keystone will pass the following props to this component.

```tsx
type NavigationProps = {
  lists: ListMeta[]
}
```

{% hint kind="tip" %}
For more information on the props, please see the [Navigation Props](#navigation-props) section of this guide.
{% /hint %}

### Setting up the layout

Next we'll want to import some components that Keystone provides to help us build our custom Navigation.

```tsx
import { NavigationContainer, NavItem, ListNavItems } from '@keystone-6/core/admin-ui/components'
```

The `NavigationContainer` component provides a container around your navigation links.

- Make our `CustomNavigation` component look and feel like the default Admin UI Navigation component.

```tsx
import { NavigationContainer, NavItem, ListNavItems } from '@keystone-6/core/admin-ui/components'
import type { NavigationProps } from '@keystone-6/core/admin-ui/components'

export function CustomNavigation({ lists }: NavigationProps) {
  return (
    <NavigationContainer>
      {/* ... */}
    </NavigationContainer>
  )
}
```

{% hint kind="tip" %}
For more information on the `NavigationContainer` see the [NavigationContainer](#navigation-container) section of the [component docs](#components) below.
{% /hint %}

### Rendering NavItems for Keystone lists

The `ListNavItems` component takes the provided Array of `lists` and renders a list of NavItems. We'll use this component to help us easily create NavItems from Keystone lists.

```tsx
import { NavigationContainer, NavItem, ListNavItems } from '@keystone-6/core/admin-ui/components'
import type { NavigationProps } from '@keystone-6/core/admin-ui/components'

export function CustomNavigation({ lists }: NavigationProps) {
  return (
    <NavigationContainer>
      <ListNavItems lists={lists}/>
      {/* ... */}
    </NavigationContainer>
  )
}
```

{% hint kind="tip" %}
For more information on the `ListNavItems` component, see the [ListNavItems](#list-nav-items) section of the [component docs](#components) below.
{% /hint %}

### Adding additional routes

The `NavItem` component is a thin styling and accessibility wrapper around the `Link` component from Next.js. We'll use this component to render our custom route as well as the `Dashboard` route.

```tsx
import { NavigationContainer, NavItem, ListNavItems } from '@keystone-6/core/admin-ui/components'
import type { NavigationProps } from '@keystone-6/core/admin-ui/components'

export function CustomNavigation({ lists }: NavigationProps) {
  return (
    <NavigationContainer>
      <NavItem href="/">Dashboard</NavItem>
      <ListNavItems lists={lists}/>
      <NavItem href="https://keystonejs.com/">
        Keystone Docs
      </NavItem>
    </NavigationContainer>
  )
}
```

{% hint kind="tip" %}
For more information on the `NavItem` component, see the [NavItem](#nav-item) section of the [component docs](#components) below.
{% /hint %}

{% hint kind="warn" %}
**Note** When opting into a custom Navigation component you will need to specify a NavItem for the `Dashboard` page (the `/` route).
{% /hint %}

### Putting it all together

With all that done, your Custom Navigation component should be good to go, and your `/admin` folder should look like this.

```tsx
// admin/components/CustomNavigation.tsx
import { NavigationContainer, NavItem, ListNavItems } from '@keystone-6/core/admin-ui/components'
import type { NavigationProps } from '@keystone-6/core/admin-ui/components'

export function CustomNavigation({ lists }: NavigationProps) {
  return (
    <NavigationContainer>
      <NavItem href="/">Dashboard</NavItem>
      <ListNavItems lists={lists}/>
      <NavItem href="https://keystonejs.com/">
        Keystone Docs
      </NavItem>
    </NavigationContainer>
  )
}


// admin/config.ts
import { AdminConfig } from '@keystone-6/core/types'
import { CustomNavigation } from './components/CustomNavigation'
export const components: AdminConfig['components'] = {
  Navigation: CustomNavigation
}
```

Start up your Keystone project, and you should see Custom Navigation with a route to the KeystoneJS docs in the Admin UI.
![finished custom navigation example](/assets/guides/custom-admin-ui-navigation/final-result.png)

{% hint kind="tip" %}
The rest of this guide will elaborate on some of the details around the helper components Keystone provides and the Navigation props that we glossed over in the main guide.
{% /hint %}

## Navigation props

This section is to provide more granular information around the props that Keystone passes to your Custom Navigation component.

```tsx
export const CustomNavigation = ({ lists }) => {}
```

Keystone passes the following props to your custom Navigation component:

```ts
type NavigationProps {
  lists: ListMeta[]
}
```

`lists` is an array of Keystone list objects. Internally Keystone filters through your lists and ensures that only visible lists are passed through to you in the `lists` array prop.

```typescript
type ListMeta = {
  /** Used for optimising the generated list of NavItems in React */
  key: string
  /** href to the list route in the Admin UI. */
  path: string
  /** Used as the label for each list generated NavItem */
  label: string
  /** Other properties exists, but these are the ones that are relevant to the Navigation implementation */
}

type Lists = ListMeta[]
```

## Components

Keystone exposes a variety of helper components to make building out your custom Admin UI Navigation component easier. These are:

- [NavigationContainer](#navigation-container)
- [ListNavItems](#list-nav-items)
- [NavItem](#nav-item)

### NavigationContainer

This component renders containing markup around your navigation links.

```tsx
import { NavigationContainer} from '@keystone-6/core/admin-ui/components'

export function CustomNavigation ({ lists }) {
  return (
    <NavigationContainer>
      {/* ... */}
    </NavigationContainer>
  )
}
```

### ListNavItems

This component takes the provided array of `lists` and renders a list of `NavItems`.

```tsx
import { ListNavItems } from '@keystone-6/core/admin-ui/components'
```

The `lists` object has the following type:

```typescript
type ListNavItemProps = {
  lists: ListMeta[]
  include: string[]
}
```

If an `include` prop is supplied, the component will only render out lists that match the list `keys` specified in the `include` array.

```tsx
const CustomNavigation = ({ lists }) => (
  <NavigationContainer>
    <ListNavItems lists={lists} include={["Task"]} />
  </NavigationContainer>
)
```

![example of navigation with include prop values](/assets/guides/custom-admin-ui-navigation/listNavItems-with-include.png)

Otherwise, all lists will be added.

```tsx
const CustomNavigation = ({ lists }) => (
  <NavigationContainer>
    <ListNavItems lists={lists} />
  </NavigationContainer>
)
```

![example of navigation without include prop values](/assets/guides/custom-admin-ui-navigation/listNavItems-without-include.png)

### NavItem

This component is a thin styling and accessibility wrapper around the `Link` component from Next.js

```tsx
import { NavItem } from '@keystone-6/core/admin-ui/components'
```

It expects the following props:

```ts
type NavItemProps = {
   // The path or URL to navigate to
  href: string,
  // React children of the component
  children: ReactNode,
  // Toggles on the selected style and aria-current attribute of the NavItem
  isSelected: boolean
}
```

By default the `isSelected` value will be evaluated by the condition `router.pathname === href`.
Pass in `isSelected` if you have a custom condition or would like more granular control over the "selected" state of Navigation items.

## Related resources

{% related-content %}
{% well
heading="Example: Custom Admin UI Navigation"
href="https://github.com/keystonejs/keystone/tree/main/examples/custom-admin-ui-navigation"
target="_blank" %}
Adds a custom navigation component to the Admin UI. Builds on the Task Manager starter project.
{% /well %}
{% well
heading="Custom Admin UI Logo Guide"
href="/docs/guides/custom-admin-ui-logo" %}
Learn how to add your own custom logo to Keystone’s Admin UI.
{% /well %}
{% well
heading="Custom Admin UI Pages Guide"
href="/docs/guides/custom-admin-ui-pages" %}
Learn how to add your own custom pages to Keystone’s Admin UI.
{% /well %}
{% /related-content %}
