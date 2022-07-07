---
title: "Azure Functions Part 3 - Building a Processing Pipeline"
categories:
  - Tech
tags:
  - Azure Functions
  - Azure
toc: true
toc_label: "Function App Processing Pipeline"
toc_sticky: true
---

In the previous posts, we looked at [the basics of Azure Functions](https://waymack.net/azure-functions-part-1-the-basics) and [building Azure Functions Web APIs](https://waymack.net/azure-functions-part-2-developing-web-apis). In this post, we are going build out the rest of the subscription processing pipeline that we outlined in part 2.

## Solution Overview

As a reminder, this is the solution we're building out.

![Functions Solution](/assets/images/azure_functions/functions_architecture.drawio.svg)

For this post, we are going to build out the following processing workflow:

1. A when a new subscription is saved to Cosmos, the **ProcessNewSubscription** Function sets up the new subscription and submits the first payment.
1. A daily timer is set up to trigger the **RetrieveDailySubscriptions** Function which submits subscriptions for payment if it is their monthly payment day.
1. Subscription payments from both of these sourcing Functions are dropped on a Service Bus queue to trigger the **ProcessPayment** Function which processes the payment and saves the payment data back to the Payments Cosmos collection.

## Infrastructure setup

We already have a Cosmos Database set up from part 2 when we built out our APIs. At this point, we'll need to set up our new Cosmos Collection and our Service Bus queue.

1. In **Cosmos DB Account > Data Explorer > New Container**
    1. Database id: **Sales**
    1. Container id: **Payments**
    1. Partition key: **/customerId**
1. Create a new Service Bus account (you can use the Basic tier):
    1. Create a queue named: **payment-queue**
    1. Grab **Service Bus Namespace > Shared access policies > RootManagedSharedAccessKey > Primary Connection String** for later use.

### Messaging and Eventing (a quick aside)

You may be wondering "why are we using Service Bus instead of Event Hub or Event Grid?" Great question! There are three primary eventing/messaging services in Azure. Microsoft provides a great [article to help understand the differences](https://docs.microsoft.com/en-us/azure/event-grid/compare-messaging-services) but this is how I think about it:

* Event Hub - Used for massive event data ingestion. Supports AMQP. Consumers control their own checkpoint of what events they read across partitions. Supports Kafka.
* Event Grid - Used for distributed, reactive systems. Consumers create subscriptions on topics and define a delivery endpoint. Event batches are sent as web requests.
* Service Bus - Used for business critical messaging. Supports AMQP. Supports queues or pub/sub topics. Consumers read individual messages and remove them after processing.

In this solution we're using Service Bus because of the guaranteed delivery, extremely fast processing, and queue messaging support. In all frankness, you could use any of the three.

## Building the Solution

Now we get to the fun part: building out the processing pipeline for subscription payments.

### Process New Subscriptions

Whenever a new subscription is created by the API, a new document is added to the Cosmos database. Cosmos has a feature called the change feed that allows consumers to listen to these document changes. We're going to trigger a new ProcessNewSubscription Function whenever a subscription is added to the database.

1. Create a new file named **Handlers/ProcessSubscriptionHandler.cs** to hold our new functions.
1. Add the Service Bus Functions package by running the following on the command line in the same directory as your **.csproj** file.

  ```dotnetcli
  dotnet add package Microsoft.Azure.WebJobs.Extensions.ServiceBus
  ```

1. Add a PaymentDay property to the Subscription model to represent which day of the month a subscription payment should be made.

  ```csharp
  [JsonProperty("paymentDay")]
  public int? PaymentDay { get; set; }
  ```

```csharp

```