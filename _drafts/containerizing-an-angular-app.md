---
title: "Containerizing an Angular App"
categories:
  - Tech
tags:
  - Software
  - Docker
  - Angular
---


I'm a pretty big fan of Angular and use it for most of my side projects. In this post I'm going to show you how to host a production version of an Angular app as a docker container. Most of the guides I've found are generally missing a few pieces so here is my guide to doing it right!

# What is Angular

For those of you who haven't used it before, Angular is a Single-Page-Application (SPA) framework that allows you to create a client-side Typescript application. That means it is HTML, CSS, and JavaScript bundled together that runs in a browser as an application.

The main reason I use Angular for most of my projects is that it is a full-featured framework. Unlike React, Vue, and Svelte (which are all great, by-the-way) I don't need to pull in a bunch of additional libraries for common application concerns (like routing, HTTP calls, etc). It's all bundled as a comprehensive framework for me.

When deploying an Angular app, we take the transpiled (TypeScript is transpiled to JavaScript) and emitted assets (HTML, CSS, JavaScript) and copy them to a web server to be hosted like any other static website.
