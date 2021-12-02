---
title: "Azure Functions Part 1 - The Basics"
categories:
  - Tech
tags:
  - Azure Functions
  - Azure DevOps
  - Azure Static Web Apps
---

## Background
Almost all new web applications are built using a SPA library/framework with a back-end web API so I was, naturally, very excited when the Public Preview version of Azure Static Web Apps was announced. It seemed like the perfect service for modern Web App development but, after I played around with it for a bit, I was generally disappointed with some of the tooling choices they made.

One of the big drawbacks was the service's deep integration with GitHub for hosting and deployment. I'm never a fan of firm dependencies on a specific tool-chain for deployment. I love using Azure DevOps (AzD) for my repos and pipelines but, after looking over the docs, it seems there is very limited support for starting a new app using AzD. 

The service went to [General Availability (GA) on May 12, 2021](https://azure.microsoft.com/en-us/blog/develop-production-scale-modern-web-apps-quickly-with-azure-static-web-apps/) and I had assumed they would have broken it away from the various tooling dependencies they had taken for the Public Preview version of the service...but they didn't. There are a few snippets on how to use AzD but all of the docs assume you're starting a new app from scratch based on their GitHub starter repos.

What if you have a SPA app that you want to migrate over to this service? What if you want to use a different repository service like GitLab, Azure DevOps, or BitBucket? 

Keep reading to find out what all I learned.

## The Existing App
The exisiting Angular app tracks employees for a company. The employees are assigned to a department, a role in that department, and an overall level within the company. Let's be honest, there's nothing flashy going on here. In general, the app won't need any modification to move it into Azure Static Web Apps since Angular apps transpile down to static assets (HTML, CSS, JavaScript) that are served up like any basic website. We'll need to modify some of the configuration properties for the service and some URIs for connecting to the web API, but it should remain as-is.

To support the app, there is an ASP.NET Core web API that tracks the employee data. 

### Function App Internals
To really understand why this distinction is important, you need to understand some of the hosting internals for a Function App. (To be precise, there are two different internal hosting models for an Azure Functions app but I'm going to focus on the isolated process model since it is the targeted model going forward. The [in-process model](https://docs.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide#differences-with-net-class-library-functions) only applies to .NET Function Apps.)