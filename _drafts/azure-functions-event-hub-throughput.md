---
title: "Azure Functions and Event Hub Throughput"
categories:
  - Tech
tags:
  - Azure
  - Azure Functions
  - Azure Event Hubs
toc: true
toc_label: "Functions and Event Hubs"
toc_sticky: true
header:
  image: /assets/images/azure_functions/functions_eh.png
  teaser: /assets/images/azure_functions/functions_eh.png
---

Real-time event processing is integral to how companies operate. From inventory updates when shipments arrive at a store to table availability when reservations are made a restaurant, every business operates off of a series of events. When we model solutions to fit business needs, event processing is an inevitable part of those solutions.

## Event Processing Architecture

A common architecture in Azure for event processing pipelines is to use [Azure Event Hubs](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about) as the eventing platform and [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview) as the compute platform that processes those events.

If you're unfamiliar with Azure Event Hubs, they are very similar to [Apache Kafka](https://en.wikipedia.org/wiki/Apache_Kafka) topics (and even have Kafka endpoints) that store an immutable, partitioned event log for consuming applications to read from.

Essentially, producers send events into the Event Hub and the Azure Function App reads those events in batches to process them and send them downstream to another system, like another Event Hub or a database.

![architecture](/assets/images/functions_eh_throughput/functions_eventhub_architecture.drawio.svg)

## Throughput Considerations

I was working with a team once that was trying to build out this exact architecture and they claimed that Azure Functions was unable to keep up with a high throughput scenario.

That didn't seem right to me because I had seen other teams build high throughput pipelines like this and not have any issues. Granted, the teams without issues had been building their Functions using C# in-process workers and the team I was talking to was using out-of-process Java workers.

In the end, I decided to create a sample processing pipeline using Java to see what type of throughput I could achieve. My goal was to try and process at least 100,000 events/sec in the consuming Azure Function.

## Test Setup

For my test, I created two Azure Function apps. One to produce events and one to consume events. You can find the code and the infrastructure deployment files at <https://github.com/joelwaymack/func-eventhubs-throughput-java>.

Tests like this need to have more load that simply logging output statements in the consuming Azure Function so I set the consumer up to calculate the first X primes where X is an integer payload in each event.

I used a Premium Event Hub namespace to mitigate any throttling issues. Basic and Standard tier Event Hub namespaces have a quota limit of 40 throughput units (TUs) and each TU has a maximum event ingestion rate per second of 1000 events. To get above this 40,000 events/sec limitation, I needed to use a Premium tier event hub.

The Function Apps are both hosted in Consumption Tier Function App Plans. The instances within a Consumption Plan are the smallest you can provision. Due to networking and computing resources, most teams would likely be using Premium plans but, for my experiment, I wanted to see if I could get away with the Consumption tier.

## Results

Events/sec

FunctionAppLogs
| where FunctionName == "ConsumeEvents"
| where Message startswith "Trigger Details: Parti"
| where TimeGenerated > ago(5m)
| parse Message with * ", EnqueueTimeUtc: "
enqueueTimeStart:datetime "+00:00-" enqueueTimeEnd:datetime "+00:00," * ", Count: "
messageCount:int
| summarize ['events/sec'] = sum(messageCount)/10 by bin(TimeGenerated, 10s)
| render timechart

consumer instances

FunctionAppLogs 
| where TimeGenerated > ago(10m)
| where FunctionName == 'ConsumeEvents'
| summarize ['instances'] = dcount(HostInstanceId) by bin(TimeGenerated, 30s)
| render timechart

dispatch times

FunctionAppLogs
| where FunctionName == 'ConsumeEvents'
| where TimeGenerated > ago(5m)
| where Message startswith "Trigger Details: Parti"
| parse Message with * "tionId: " partitionId:string ", Offset: "
offsetStart:string "-" offsetEnd:string", EnqueueTimeUtc: "
enqueueTimeStart:datetime "+00:00-" enqueueTimeEnd:datetime "+00:00, SequenceNumber: "
sequenceNumberStart:string "-" sequenceNumberEnd:string ", Count: "
messageCount:int
| extend dispatchTimeMilliseconds = (TimeGenerated - enqueueTimeStart) / 1ms
| summarize percentiles(dispatchTimeMilliseconds, 50, 90, 95, 99) by bin(TimeGenerated, 30s)
| render timechart

producer instances

FunctionAppLogs 
| where TimeGenerated > ago(10m)
| where FunctionName == 'ProduceEventBatch'
| summarize ['instances'] = dcount(HostInstanceId) by bin(TimeGenerated, 30s)
| render timechart