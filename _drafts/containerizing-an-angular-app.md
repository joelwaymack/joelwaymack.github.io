---
title: "Containerizing an Angular App"
categories:
  - Tech
tags:
  - Software
  - Docker
  - Angular
  - Container
---


I'm a pretty big fan of [Angular](https://angular.io/docs) and use it for most of my side projects. I'm also a big fan of containerization and I like to host my Angular apps in a docker container. Most of the guides I've found are generally missing a few pieces so here is my guide to doing it right!

# What is Angular

For those of you who haven't used it before, Angular is a Single-Page-Application (SPA) framework that allows you to create a client-side Typescript application. That means it is HTML, CSS, and JavaScript bundled together that runs in a browser as an application.

The main reason I use Angular for most of my projects is that it is a full-featured framework. Unlike [React](https://reactjs.org/docs/getting-started.html), [Vue](https://vuejs.org/guide/introduction.html), and [Svelte](https://svelte.dev/docs) (which are all great, by-the-way) I don't need to pull in a bunch of additional libraries for common application concerns (like routing, HTTP calls, etc). It's all bundled as a comprehensive framework for me.

# Hosting Targets

When deploying an Angular app, we take the transpiled (TypeScript is transpiled to JavaScript) and emitted static assets - HTML, CSS, JavaScript - and copy them to a web server to be hosted like any other static website.

While you could take these assets and deploy them to [Azure Storage as a Static Website](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website) or [AWS S3 as a website](https://docs.aws.amazon.com/AmazonS3/latest/userguide//WebsiteHosting.html), I like containerizing my apps so I have a consistent deployment target like [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/overview) or a Kubernetes implementation like [AKS](https://learn.microsoft.com/en-us/azure/aks/intro-kubernetes). That way my APIs, event-processing apps, and front-end apps are all hosted in the same environment.

# Containerizing Angular

