---
title: Containerizing an Angular App
description: How to containerize an Angular App with startup environment variables
pubDate: 2022-12-21
categories:
  - Tech
tags:
  - Software
  - Docker
  - Angular
  - Container
heroImage: /images/containerizing_angular/header.jpg
---


I'm a pretty big fan of [Angular](https://angular.io/docs) and use it for most of my side projects. I'm also a big fan of containerization and I like to host my apps, no matter what they're written in, in docker containers.

You can find a number of guides out there that walk you through containerizing an Angular app (or [Single Page Application](https://en.wikipedia.org/wiki/Single-page_application) - SPA) but they rarely outline the concerns around promoting your application through multiple deployment environments. Here is a quick guide to containerizing a SPA application with deployment environment specific configuration values.

This guide references an [example Angular App](https://github.com/joelwaymack/angular-docker-example) but the guidelines could be used for almost any SPA library or framework.

## SPA Considerations

For those of you who haven't used it before, Angular is a SPA framework that allows you to create a client-side Typescript application. That means it is HTML, CSS, and JavaScript bundled together that runs in a browser as an application.

[React](https://reactjs.org/docs/getting-started.html), [Vue](https://vuejs.org/guide/introduction.html), and [Svelte](https://svelte.dev/docs) are similar libraries/frameworks that are also popular choices for SPAs. When deploying a SPA app, we take the transpiled (TypeScript is transpiled to JavaScript) and emitted static assets - HTML, CSS, JavaScript - and copy them to a web server to be hosted like any other static website.

While you could take these assets and deploy them to [Azure Storage as a Static Website](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website) or [AWS S3 as a website](https://docs.aws.amazon.com/AmazonS3/latest/userguide//WebsiteHosting.html), I like containerizing my apps so I have a consistent deployment target like [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/overview) or a Kubernetes implementation like [AKS](https://learn.microsoft.com/en-us/azure/aks/intro-kubernetes). That way my APIs, event-processing apps, and front-end apps are all hosted in the same environment.

## The Environment Problem

Almost all software development projects have a set of [deployment environments](https://en.wikipedia.org/wiki/Deployment_environment) that represent various levels of testing and usage. As a software build is verified in each deployment environment, it is promoted to the next deployment environment for a higher level of testing until it reaches the "production environment" where the software is utilized by actual end-users or real systems.

![environments](/images/containerizing_angular/environments.drawio.svg)

Each time software is promoted to the next deployment environment, certain values within the system need to change. A common example in SPA applications is that a backend Web API in the "development" deployment environment will have a different URL than the backend Web API in the "test" deployment environment. As such, the configuration value in the SPA for the URL will need to change when the software is deployed in each deployment environment.

For most server-side applications (ASP.NET, Java Spring, Node.js), a configuration file or host machine environment variable can be set to control the deployment environment specific values. This won't work for a SPA since the SPA is running "client-side" in a user's browser and doesn't have the same execution environment that a server-side application does.

Some teams create a config.json file on their web server that their SPA app retrieves to get these configuration values but I'm not a big fan of this practice for a few reasons. First, on startup, the app will need to load the index.html file and then, when it encounters the tag to grab the config.json file, it will go back and retrieve it from the web server. This is additional latency you're adding in to your app startup time. This method would also, generally, require your app to be redeployed to change config values since we shouldn't be hand-modifying files in our deployment environments.

My proposal is to utilize the environment variables injected into the hosting container of our application and copy them over to the index.html file on container startup. That way our configuration values can change dynamically based on container hosting and we don't have extra latency when the application starts up in an end-user's browser.

## Angular App Setup

To make this happen, we'll need to set up our Angular app to retrieve and use these configuration values.

### Angular Config Service

The first step is creating a config [service](https://angular.io/guide/creating-injectable-service) that will provide our dynamic configuration values to the rest of the app. This service will pull values that have a certain prefix from the global [window object](https://www.w3schools.com/jsref/obj_window.asp), in our case the prefix will be **APP_ENV_VAR_**, and create an object to hold them. Specific config values that we want to provide to our app can also be defined as explicit [getters](https://www.typescriptlang.org/docs/handbook/2/classes.html#getters--setters) in our service to make them easier to retrieve.

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private _config = {};

  public get config(): any {
    return this._config;
  }

  public get apiUrl(): string {
    return this._config['apiUrl'];
  }

  public get environment(): string {
    return this._config['environment'];
  }

  constructor() {
    const prefix = 'APP_ENV_VAR_';
    Object.getOwnPropertyNames(<any>window)
      .filter(prop => prop.startsWith(prefix))
      .forEach(prop => {
        const key = prop.replace(prefix, '');
        this._config[key] = (<any>window)[prop]
      });
  }

  public getValue(key: string): string {
    return this[key];
  }
}
```

### Index.html

Our index.html file will need to have an explicit script section defined where the window object config values will be set. This section will be overwritten during container startup to provide our dynamic environment variables.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Angular Docker Example</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <script id="APP_ENV_VAR">
    window.APP_ENV_VAR_environment = 'local';
    window.APP_ENV_VAR_apiUrl = 'https://swapi.dev/api/people/1';
  </script>
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

## Containerizing Angular

With a little trickery, we can mimic host environment variable settings in the containerized Angular app. To do this, we'll need to set up containerization for our app.

### Modify the Build Output Folder

Most SPA libraries and frameworks have some sort of build tooling associated with them. In Angular, this is the Angular CLI which transpiles the TypeScript into JavaScript, converts the SCSS to CSS, and then bundles the HTML, CSS, and JavaScript together throwing everything into a "dist/{project_name}" folder.

I generally recommend changing the angular.json file that describes the Angular app so that the output of the build goes directly into the "dist" folder.

```json
{
  ...
  "projects": {
    "angular-docker-example": {
      ...
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist", <- Modify this line
  ...
}
```

### Add a Dockerfile

The next thing to do in creating a container is to add a Dockerfile to the app in the top-level directory. The example below uses a node:alpine base image for building the app and then it copies the bundled assets into an nginx:alpine image for serving the app. Nginx is a popular web server used to host static websites.

```dockerfile
FROM node:alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh
RUN sed -i 's/\r//' /app/startup.sh
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
ENTRYPOINT ["sh", "/app/startup.sh"]
```

To ensure the build runs as quickly as possible, you'll also want to add a .Dockerignore file to the top-level directory so we don't copy over the node_modules or other unneeded folders, especially when building the container locally.

```dockerfile
node_modules
.vscode
dist
```

### Nginx Setup

The Nginx server will need some special setup if it is to host our app with [deep-linking](https://en.wikipedia.org/wiki/Deep_linking) enabled. If we don't include this setup, if anyone navigates to <https://app.com/a-route> the Nginx server won't be able to find an asset called "a-route" and will return a 404 Not Found error.

The specific Nginx configuration file is saved in our app's top-level directory and is copied into the correct place when the hosting container is created.

```terraform
server {
    listen 80;
    location / {
        root   /usr/share/nginx/html;
        index  index.html;

        try_files $uri $uri/ /index.html?$args;
    }
}
```

### Startup Script

The magic for our setup really comes from the startup.sh file. This script runs when the hosting container starts and performs a number of important tasks.

```bash
#!/bin/sh
# Retrieve all app config values.
prefix=APP_ENV_VAR
script=$(echo "<script id=\""$prefix"\">")
env | awk -F "=" '{print $1}' | grep "$prefix.*" | while read n ; do
    start=$(echo "window."$n" = '")
    val=$(printenv $n)
    line=$(echo $start$val"';")
    sed -i "\|$start|d" /usr/share/nginx/html/index.html
    awk -v line="$line" -v script="$script" '$0~script { print; print line; next}1' /usr/share/nginx/html/index.html > /usr/share/nginx/html/temp.html
    cp /usr/share/nginx/html/temp.html /usr/share/nginx/html/index.html
done

# Remove the temp file.
rm /usr/share/nginx/html/temp.html

# Start nginx.
nginx -g 'daemon off;'
```

This script grabs all of the environment variables in the container that have a specific prefix, APP_ENV_VAR. It then looks in a specific script tag, id="APP_ENV_VAR", in our app's index.html file and either writes or replaces the values as global variables attached to the JavaScript window object. Lastly, it kicks off the nginx server.

### Building and Running the Container Locally

We can use the following commands to build, run, and test the container locally as long as [Docker Desktop](https://www.docker.com/products/docker-desktop/) is running and we're in our app's top-level directory.

```bash
docker build -t ng-app .
docker run -e "APP_ENV_VAR_apiUrl=https://swapi.dev/api/starships/2" -e "APP_ENV_VAR_environment=dev" -it --rm -p 8080:80 ng-app
```

Navigating to <http://localhost:8080> will then bring up the app. You should see the dynamic config values that we set when we started the app.

## Conclusion

That's it. A containerized Angular app with dynamic config values set based on the deployment environment. Here is the full [example Angular App](https://github.com/joelwaymack/angular-docker-example) if you're interested. Hopefully this trick can help you in the future.
