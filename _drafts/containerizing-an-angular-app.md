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


I'm a pretty big fan of [Angular](https://angular.io/docs) and use it for most of my side projects. I'm also a big fan of containerization and I like to host my Angular apps in a docker container. You can find a number of guides out there that walk you through containerizing an Angular app (or [Single Page Application](https://en.wikipedia.org/wiki/Single-page_application) - SPA) but they rarely outline the concerns around promoting your application through multiple environments so here is my guide.

[This is the example Angular App repo.](https://github.com/joelwaymack/angular-docker-example)

# What is Angular

For those of you who haven't used it before, Angular is a SPA framework that allows you to create a client-side Typescript application. That means it is HTML, CSS, and JavaScript bundled together that runs in a browser as an application.

The main reason I use Angular for most of my projects is that it is a full-featured framework. Unlike [React](https://reactjs.org/docs/getting-started.html), [Vue](https://vuejs.org/guide/introduction.html), and [Svelte](https://svelte.dev/docs) (which are all great, by-the-way) I don't need to pull in a bunch of additional libraries for common application concerns (like routing, HTTP calls, etc). It's all bundled as a comprehensive framework for me.

# Hosting Targets

When deploying an Angular app, we take the transpiled (TypeScript is transpiled to JavaScript) and emitted static assets - HTML, CSS, JavaScript - and copy them to a web server to be hosted like any other static website.

While you could take these assets and deploy them to [Azure Storage as a Static Website](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website) or [AWS S3 as a website](https://docs.aws.amazon.com/AmazonS3/latest/userguide//WebsiteHosting.html), I like containerizing my apps so I have a consistent deployment target like [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/overview) or a Kubernetes implementation like [AKS](https://learn.microsoft.com/en-us/azure/aks/intro-kubernetes). That way my APIs, event-processing apps, and front-end apps are all hosted in the same environment.

# The Environment Problem

Almost all software development projects have a set of [deployment environments](https://en.wikipedia.org/wiki/Deployment_environment) that represent various levels of testing and usage. As a software build is verified in each deployment environment, it is promoted to the next deployment environment for a higher level of testing until it reaches the "production environment" where the software is utilized by actual end-users or real systems.

Each time software is promoted to the next deployment environment, certain values within the system need to change. A common example in SPA applications is that a backend Web API in the "development" deployment environment will have a different URL than the backend Web API in the "quality assurance" (QA) deployment environment. As such, the configuration value in the SPA for the URL will need to change when the software is deployed in each deployment environment.

For most server-side applications (ASP.NET, Java Spring, Node.js), a configuration file or host machine environment variable can be set to control the deployment environment specific values. This won't work for a SPA since the SPA is running "client-side" in a user's browser and doesn't have the same execution environment that a server-side application does.

# Containerizing Angular

With a little trickery, we can mimic host environment variable settings in containerized SPA application. What we'll do is 