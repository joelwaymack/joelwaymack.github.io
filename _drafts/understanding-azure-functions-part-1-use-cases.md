---
title: "Understanding Azure Functions - Part 1"
categories:
  - Tech
tags:
  - Azure
  - Azure Functions
---
In this series we are going to dive in and understand more about Azure Functions. Azure Functions is a compute offering in Microsoft Azure that, like AWS Lambda or GCP Cloud Functions, allows developers to execute small chunks of code when certain triggering events occur. In this post we are going to discus the basics of Azure functions and look at some common use cases.

# Functions as a Service
If you have spent any time in the cloud computing world, you have probably head of various "as a Service" offerings. Infrastruture as a Service (IaaS), Platform as a Service (PaaS), Database as a Service (DbaaS), Software as a Service (SaaS), Functions as a Service (FaaS) etc. Each of these offerings provide different benefits and are useful in certain situations.

FaaS offerings are central to event-driven systems. No matter what cloud provider you use, the overall goal for FaaS is to execute code based on a triggering event. These events can be sourced from a variety of sources (HTTP request, message arrives on a queue, a file is uploaded to storage, a timer expires, etc.). The key aspect of FaaS in these scenarios is that the function code should be small and scoped to a single task based off the event.

Many times you'll hear FaaS called "serverless" computing.

# What's in a Name
I dislike the term "serverless" but it's become a common term in the technology industry. Yes, there are servers running your code if you use FaaS. And yes, you do have to care about them because your code will require some baseline compute and memory to function properly.

So, why did someone decide to label it "serverless" computing? It generally comes from the fact that many of the "standard" (read old school) concerns that you needed to design your infrastructure to handle (connectivity, load balancing, scaling, etc.) gets abstracted away so you can, generally, focus on writing code and designing systems that provide meaningful business value.

# Azure Functions
Azure Functions is one of the primary computing options in Azure that falls into the "serverless" and FaaS category. When building new software or systems, I almost always default to it. I can build web APIs, data processing pipelines, or anything else quickly with very little overhead.

