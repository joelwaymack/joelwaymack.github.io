---
title: Azure Functions Part 1 - The Basics
description: An introduction to Azure Functions and Functions core concepts
pubDate: 2021-12-02
categories:
  - Tech
tags:
  - Azure Functions
  - Azure
heroImage: /images/azure_functions/header.png
---

If you have spent any time in the cloud computing world, you have probably heard of various "as a Service" offerings. Infrastruture as a Service (IaaS), Platform as a Service (PaaS), Database as a Service (DbaaS), Software as a Service (SaaS), Functions as a Service (FaaS), etc. Each of these offerings provide different benefits and are useful in certain situations.

Functions as a Service (FaaS) offerings are central to event-driven systems. No matter what cloud provider you use, the overall goal for FaaS is to execute code based on a triggering event. These events can be sourced from a variety of sources (HTTP request, a message arrives on a queue, a file is uploaded to storage, a timer expires, etc.). The key aspect of FaaS in these scenarios is that the function code should be small and scoped to a single task based off the event.

Azure Functions are the core FaaS "serverless" compute offering in Microsoft Azure.

## The Anatomy of a Function

The key to Azure Function development is understanding triggers and bindings. At a very high level, triggers and bindings are how an individual function interacts with the ecosystem around it: triggers are used to invoke functions and bindings allow you to receive or send data to certain external components.

You may be wondering why input/output bindings exist. You can use a library or SDK to connect to your database or a message queue, right? Of course you can. Bindings are there to accelerate development because you don't have to worry about connecting to external systems. You simply define what you need and the app takes care of connection concerns like connection pooling, retries, buffer caching, etc.

![Function Binding Image](/images/azure_functions/function_bindings.png)

### Trigger

A trigger defines the event that causes a Function to execute. It could be receiving an HTTP request, receiving a message on a queue, a timer elapsing, or a variety of other events. Every function must have a single trigger so that the host knows when to execute your code. (More on the host later.)

### Input Bindings

Input bindings allow you to request additional data after the triggering event is received but before your function code is executed. When an input binding is defined, the function host makes the call to the dependent resource so you don't have to manage the connection. You can have zero to many input bindings defined for a function.

Once again, can you simply make a database call in your code to retrieve what you need? Certainly! Remember, input bindings are there to make your life easier and hopefully accelerate your development.

### Output Bindings

Output bindings allow you to return data from your Function code and have the function host write a message to a queue, store data in a database, or send data on to a variety of different services. You can have zero to many output bindings defined for a function.

### Supported Bindings

There are a number of supported bindings that you can find in the [supported bindings table](https://docs.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings). If you can't find what you need in the officially supported list of bindings you might be able to find a community supported binding.

You can also [build your own bindings](https://github.com/Azure/azure-webjobs-sdk/wiki/Creating-custom-input-and-output-bindings) if you think you'll get enough use out of them. I've generally found it easier to create a connection in my code than it is to build a custom binding but it's really up to you.

## Function Apps

The easiest way to think of a Function App is as a complete application utilizing an application framework. Similar application frameworks (though these are primarily web application frameworks) are Spring Boot, ASP.NET, and Node.js Express. The key to these frameworks is that they offload certain common concerns to allow you to build a robust application.

Function Apps, likewise, offload certain common concerns so that you can focus on writing your code.

### Multiple Functions

A common misconception for developers approaching Azure Functions for the first time (especially if you've used AWS Lambda) is that an Azure Function app is the same as a function. Let's be clear on this point: a Function App can have one to many functions inside of it.

A good mental model for functions in a Function App is to think of them as individual HTTP endpoints in a Spring Boot, ASP.NET, or Node.js Express app. Each Function executes based on a specific triggering event but you can have multiple functions listening for distinct events in a Function App.

### Function App Internals

I want to mention two components that are internal to a Function App because they often get mentioned in conversations around Function Apps: the host process and the worker process.

The host process monitors the trigger for each function in the app and executes the input and output binding calls for each function invocation. It also monitors (through an additional component called the Scale Controller) event throughput and recommends scaling the number of app instances currently provisioned in or out to handle load properly.

The worker process is where your function code lives. The Functions host will invoke the functions in the worker process when triggering events occur and the worker process will pass back results to the host process when it finishes invocation execution.

The worker process is language specific to whatever language you chose for your Function App while the host process, which you don't really touch, is written in .NET and maintained by the Azure Functions team.

![Function App Internals](/images/azure_functions/function_app_internals.png)

## Function Use Cases

On to the fun stuff! How do functions fit into the overall architecture to solve business problems? Let's take a look at some high-level use cases.

### Web API

Utilizing HTTP triggered functions, you can create a robust web API that executes based off of specific routes, HTTP methods, and route parameters. These functions can tie into a Cosmos database and utilize input and output bindings for interacting with the database.

### Event Ingestion and Transformation

Using an Azure Event Hub, a Kafka topic, or an Azure Event Grid topic, you can trigger a function to take a batch of events, do some sort of transformation, and then send the transformed events, through an output binding, to a different topic for additional processing. In this fashion you can create a series of transformation or processing steps in a near-real-time event processing pipeline.

### Scheduled Jobs

With a timer trigger, you can execute a function at a specific time of day or on some CRON defined schedule to retrieve database records and then store them in a CSV in Azure blob storage for ingestion by another system. While the database connection might have to be written into your code, saving the file to blob storage could be an output binding.

## What's Next

Let me say that I love Azure Functions. They're powerful, flexible, and they accelerate development for teams that use them. Check out the next post in this series, [Developing Web APIs](https://waymack.net/azure-functions-part-2-developing-web-apis/), to learn more!
