---
title: "Azure Functions Part 4 - Hosting Azure Functions"
categories:
  - Tech
tags:
  - Azure Functions
  - Azure
toc: true
toc_label: "Hosting Azure Functions"
toc_sticky: true
header:
  image: /assets/images/azure_functions/header.png
---

In the previous posts, we looked at [the basics of Azure Functions](https://waymack.net/azure-functions-part-1-the-basics), [building Azure Functions Web APIs](https://waymack.net/azure-functions-part-2-developing-web-apis), and [building an Azure Functions processing pipeline](https://waymack.net/azure-functions-part-3-building-a-processing-pipeline). In this post, we are going look at deploying our solution to Azure and hosting it as a production system.

The complete code can be found at <https://github.com/joelwaymack/subscription-processing-functions-csharp>.

## Solution Overview

As a reminder, this is the solution that we've built out from a functional standpoint.

![Functions Solution](/assets/images/azure_functions/functions_architecture.drawio.svg)

Now that we have the functionality built, it's time to deploy all the resources and host our solution in Azure. Before we start provisioning things and deploying our Function App, let's discuss some important concepts.

## Function App Hosting Options

As we discussed in [the basics of Azure Functions](https://waymack.net/azure-functions-part-1-the-basics), Azure Functions is closer to an application framework than simply a hosting platform. One of the benefits of this model is that we can run our Function App locally during our development cycle. Another benefit is that we can containerize our Function App and deploy it to [Azure Container Apps](https://docs.microsoft.com/en-us/azure/container-apps/overview), [Azure Kubernetes Service](https://docs.microsoft.com/en-us/azure/aks/intro-kubernetes), or any other Kubernetes-based service (like AWS's EKS or GCP's GKE) that supports [KEDA](https://keda.sh) scalers.

But, let's be honest. Most people are deploying Function Apps into an Azure Function App resource out in Azure. It's the easiest and most natural deployment target. We generally target Kubernetes deployments when massive scale for our app is needed (> 100 concurrent app instances) or we want to have all application components in our system running in the same hosting environment. In terms of massive scale, I've only encountered that scale once...and it was due to some misconfigurations for scaling.

To host a Function App in Azure, there are two primary resources that need to be provisioned: the Hosting Plan and the Function App resource.

### Hosting Plans

The hosting plan is the actual computing resource pool that hosts your Function App. There are three Hosting Plan types in Azure:

* Consumption Plan - This is the plan type that most people think about when they think of "serverless computing." Azure adds host (VM) instances to the hosting pool depending on the need and can scale down to zero. This means you can experience "cold start" times as the plan scales from zero to one instance to execute triggers. Azure automatically scales the number of instances based on trigger types and unexecuted Function triggers up to the maximum number of instances you'll allow. This is the most cost effective plan because you pay for the number of Function executions, execution time, and memory used. The biggest drawback to this plan is it doesn't have most of the networking options that we'll discuss later (as of the date of this article being posted).
* Dedicated (App Service) Plan - This plan type is useful when you are hosting apps on Azure App Service and have extra compute you would like to utilize. App Service plans allow for auto-scaling but you have to define the auto-scaling rules for the host instances (generally memory and CPU utilization levels). The plan never scales to zero instances meaning you won't experience cold-start times but you do have a minimum monthly cost associated with it. This plan also allows for all the networking options that you might need and can be the cheapest hosting plan option with networking but the scaling options aren't ideal for Function Apps.
* Functions Premium Plan - This plan type is ideal for hosting Function Apps for multiple reasons. First, it scales like the consumption plan based on trigger types and unexecuted Function triggers. This scaling is based on event counts and built-in heuristics for each trigger type so you get the best scaling performance. This plan also has at least one always-running instance in the plan pool so you'll never experience cold-starts like the consumption plan but you'll pay for that instance even when it's not being used. The premium plan also has all the networking options you might need.

The last thing to understand is that, when hosting your Function App, you'll generally have a single Consumption Plan per Function App, but you can host multiple Function Apps on a Dedicated or Premium plan to ensure efficient resource utilization.

### Function App

When you provision a new Function App in Azure, you'll need to choose an already created hosting plan or create a new one as you're creating the Function App. The Function App is where you deploy your Function App code/package and it contains configuration values for injected environment variables, Application Insights telemetry capture, network injection, managed identity, and other important things.

## Security in Layers

We could easily host our Function App on a consumption plan, keep our Cosmos Account and Service Bus Namespace publicly accessible, and call it a day. Cosmos and Service Bus require access through keys so this would be secure, but when we start talking about security hardening, we come to a concept called security in depth. Essentially, we want to try and create as many layers of secure access as possible so it is harder for malicious entities to access our systems, especially our data.

## Physical Architecture

So let's update our architectural diagram to show the physical makeup of the system we're deploying:

![Functions Physical Architecture](/assets/images/azure_functions/functions_physical_architecture.drawio.svg)

