---
title: "Events and Messaging on Azure"
description: A comparison of the event and messaging services in Azure
pubDate: 2024-01-01
categories:
  - Tech
tags:
  - Azure
  - Azure Event Hub
  - Azure Event Grid
  - Azure Service Bus
  - Azure Storage
heroImage: /images/events_messaging/header.jpg
---

If we're honest with one another, most cloud providers probably have an excess of service offerings that you can provision. Many of those services overlap with one another and could be substituted in an architectural design without much impact to a system.

I often find that the most confusing service overlap in Azure happens in the eventing and messaging space. Hopefully this overview will be helpful to people as they try to figure out what eventing or messaging service to use.

## What's in a Name

You may be wondering why I use the grouped term "eventing and messaging" services. Personally, it's a mouthful and I dislike using it. The problem is the [Azure documentation](https://learn.microsoft.com/en-us/azure/event-grid/compare-messaging-services#event-vs-message-services) makes a strong delineation between an event and a message.

Events, according to the documentation, are "lightweight notifications of a condition or state change" while a message is "raw data produced by a service to be consumed or stored elsewhere" with a contract existing "between the two sides." Personally, I find this delineation a bit arbitrary.

Anything consuming an event will need to know the structure of the event data. This implies a contract between producer and consumer, even if it's very loose. Likewise, a message is generated based on some condition or state change and the payload can be small and lightweight.

Whatever you decide to call these data elements passed through a distributed solution, there are three primary services in Azure that you should evaluate: Event Grid, Service Bus, and Event Hubs.

## Azure Services

Here's my quick guide to the differences between each service:
