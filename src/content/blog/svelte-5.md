---
title: Svelte 5 Review
description: Big Changes to a Good Framework
pubDate: 2024-10-14
categories:
  - Tech
tags:
  - Svelte
  - TypeScript
  - JavaScript
  - Front-end
heroImage: /images/svelte-5/header.jpg
---

I've enjoyed working with [Svelte](https://svelte.dev/) as a Front-end framework for quite a while. While it's not as robust as Angular, or as popular as React, I've used it extensively on various projects and I've come to enjoy how simple and clean it is.

I recently refactored a project I'm working on and decided to converted the web app from Svelte 4 to Svelte 5. Here's my initial thoughts around the new version of Svelte.

## Svelte 4 Reactivity

In previous versions of Svelte, component template reactivity was kind of magic. If you declared a variable in your JS/TS, it was marked as reactive by Svelte and changes would be tracked. Things got a bit hairy when you had a derived variable that needed to update when another reactive variable updated. Take this simple calculator for example:

```svelte
<script lang="ts">
  let num = 0;
  $: product = num * 2;
</script>

<div>
  <label for="num">Number:</label>
  <input type="number" bind:value={num} id="num" />
</div>

<p>
  Number * 2 = {product}
</p>
```

The `$:` represents a derived, reactive variable but the syntax is pretty weird to anyone not familiar with Svelte. Even more strange is if you wanted to create a reactive block:

```svelte
<script lang="ts">
  let num = 0;
  let product = 0;
  $: {
    const multiplier = 2;
    product = num * multiplier;
  }
</script>

<div>
  <label for="num">Number:</label>
  <input type="number" bind:value={num} id="num" />
</div>

<p>
  Number * 2 = {product}
</p>
```

In this scenario you could have some complex logic going on in the reactive block and Svelte would track which reactive variables were being used so it knew when to re-run the reactive block. Once again, the syntax was a bit esoteric for people unfamiliar with Svelte.

Changes were also only tracked at the object reference level. So, if you added a new element to a reactive array, or changed the value of a property on a reactive object, you would need to set the object to itself so Svelte knew a property (or element) had changed and the template should be re-rendered. Definitely not ideal.

## Svelte 5 Runes

Svelte 5 moves away from this type of reactivity in favor of a common approach within JavaScript frameworks: signals.

Signals, which Svelte 5 calls runes, are pretty popular and simply represent what you saw above in Svelte 4 reactivity but in a fine-grained, cascading, reactive approach.

Using Svelte runes allows us to be explicit about the fine-grained reactivity we want:

```svelte
<script lang="ts">
  let num = $state(0);
  let product = $derived(num * 2);
</script>

<div>
  <label for="num">Number:</label>
  <input type="number" bind:value={num} id="num" />
</div>

<p>
  Number * 2 = {product}
</p>
```

Just like the reactive blocks in Svelte 4, we can also execute a block of code to create the derived (or comupted) product:

```svelte
<script lang="ts">
  let num = $state(0);
  let product = $derived.by(() => {
    return num * 2;
  });
</script>

<div>
  <label for="num">Number:</label>
  <input type="number" bind:value={num} id="num" />
</div>

<p>
  Number * 2 = {product}
</p>
```

So far, this doesn't seem to be that exciting; it merely looks like a small syntax change. Where this does get exciting is _WHERE_ we can define these runes in our app.

## Runes Everywhere

Instead of limiting reactive values to our components like in Svelte 4, Svelte 5 allows us to declare runes anywhere in our application as long as it is inside a `*.svelte.ts` file. This means we can make common services that contain application state and react to that centralized state across components in our application.

As an example, let's consider a `user-service.svelte.ts` file that contains the information for the logged in user for our app.

```typescript
const user = $state({
  firstName: "Joel",
  lastName: "Waymack",
});

const fullName = $derived(user.firstName + " " + user.lastName);

export const getUserService = () => {
  return {
    get user() {
      return user;
    },
    get fullName() {
      return fullName;
    },
  };
};
```

The runes for `user` and `fullName` will reactively change throughout the application. For instance, a user-editor component that looks like this:

```svelte
<script lang="ts">
  import { getUserService } from '$lib/user.svelte';
  const userService = getUserService();
</script>

<div>
  <label for="firstName">First Name</label>
  <input id="firstName" type="text" bind:value={userService.user.firstName} />
</div>
<div>
  <label for="lastName">Last Name</label>
  <input id="lastName" type="text" bind:value={userService.user.lastName} />
</div>
```

would update any component watching the `UserService` runes like the user-display component:

```svelte
<script lang="ts">
  import { getUserService } from '$lib/user.svelte';
  const userService = getUserService();
</script>

<p>First Name: {userService.user.firstName}</p>
<p>Last Name: {userService.user.lastName}</p>
<p>Full Name: {userService.fullName}</p>
```

This makes Svelte 5 a winner in my book. But there are more changes to the framework that make it even better.

## Props Rune

In Svelte 4, you had to declare every component property using an `export` keyword. In Svelte 5, you instead use a `$props` rune to destructure your properties as (potentially bindable) runes. Here is an example:

```svelte
<script lang="ts">
  import CarDetails from "./car-details.svelte";

  let {
    make,
    model = $bindable(),
    color,
    ...props
  }: {
    make: string;
    model: string;
    color: "blue" | "green" | "yellow" | "red" | "black";
  } = $props();
</script>

<h1>{make} <input bind:value="{model}" /></h1>
<p>Color: {color}</p>
<CarDetails {...props}></CarDetails>
```

With the `props` rune I can destructure the props I want to use, and then pass on the props I don't need in this component to a nested component without having to define each property individually. I can also declare which props can be bound to (using the `$bindable` rune) by the parent component for direct data manipulation.

Once again, I'm a fan of these changes.

## Event Handler Names

The last big change to Svelte 5 is event handler naming. Now the naming corresponds with the JavaScript events you are likely familiar with. For example, in Svelte 4, the click event handler was named `on:click` while, in Svelte 5, it is simply `onclick`.

This change is great because events are named as you would expect if you've worked with JavaScript for a while.

## Conclusion

While Svelte 5 is still a release candidate and subject to change before it's fully released, I wouldn't hesitate to recommend developers use it for new projects they're working on. These changes make it an even better framework than before and I give it a hearty two thumbs up.
