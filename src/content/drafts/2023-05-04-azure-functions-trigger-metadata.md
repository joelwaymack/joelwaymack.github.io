---
title: "Azure Functions Trigger Metadata"
categories:
  - Tech
tags:
  - Azure
  - Azure Functions
toc: true
toc_label: "Trigger Metadata"
toc_sticky: true
header:
  image: /assets/images/event_metadata/header.jpg
  teaser: /assets/images/event_metadata/header.jpg
---

Azure Functions are a common way to build event-driven systems in Azure. You can read more in-depth about them in my [overview series on Azure Functions](https://waymack.net/azure-functions-part-1-the-basics/). One of the problems you'll encounter when you start using Azure Functions is the need for more than an event's payload or body. Often you need to know of the metadata associated with an event for processing or logging purposes. In this post, I'll walk through how to access Azure Functions trigger event metadata in a variety of supported languages.

## Event Metadata

In simple scenarios with Azure Functions, generally the only data we need to execute our logic is the event body, if that much. Think about the following triggers and scenarios:

* Timer Trigger - You need to know the day of the month so you can retrieve the right set of records from the database corresponding to the monthly schedule. This data is readily available in the TimerInfo passed into your Function through the trigger binding.
* Service Bus Queue Trigger - You need the body of the message to convert the order information received from XML to JSON so it can be sent to the next Service Bus queue for processing. This data is readily available as the trigger binding parameter.
* Http Trigger - You need to grab the request body that contains the new customer object JSON and save it to the database. This data is available as a property in the HttpRequest trigger binding parameter.

## Azure Services

Here's my quick guide to the differences between each service:
