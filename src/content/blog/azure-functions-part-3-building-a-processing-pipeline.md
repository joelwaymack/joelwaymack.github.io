---
title: Azure Functions Part 3 - Building a Processing Pipeline
description: Building a processing pipeline with Azure Functions and Azure Service Bus
pubDate: 2022-07-08
categories:
  - Tech
tags:
  - Azure Functions
  - Azure
heroImage: /images/azure_functions/header.png
---

In the previous posts, we looked at [the basics of Azure Functions](https://waymack.net/azure-functions-part-1-the-basics) and [building Azure Functions Web APIs](https://waymack.net/azure-functions-part-2-developing-web-apis). In this post, we are going build out the rest of the subscription processing pipeline that we outlined in part 2.

The complete code can be found at <https://github.com/joelwaymack/subscription-processing-functions-csharp>.

## Solution Overview

As a reminder, this is the solution we're building out.

![Functions Solution](/images/azure_functions/functions_architecture.drawio.svg)

For this post, we are going to build out the following processing workflow:

1. When a new subscription is saved to Cosmos, the **ProcessNewSubscription** Function sets up the new subscription and submits the first payment.
1. A daily timer is set up to trigger the **RetrieveDailySubscriptions** Function which submits subscriptions for payment if it is their monthly payment day.
1. Subscription payments from both of these sourcing Functions are dropped on a Service Bus queue to trigger the **ProcessSubscriptionPayment** Function which processes the payment and saves the payment data back to the Payments Cosmos collection.

## Infrastructure setup

We already have a Cosmos Database set up from part 2 when we built out our APIs. At this point, we'll need to set up our new Cosmos Collection and our Service Bus queue.

1. In **Cosmos DB Account > Data Explorer > New Container**
   1. Database id: **Sales**
   1. Container id: **Payments**
   1. Partition key: **/customerId**
1. Create a new Service Bus account (you can use the Basic tier):
   1. Create a queue named: **payment-queue**
   1. Grab **Service Bus Namespace > Shared access policies > RootManagedSharedAccessKey > Primary Connection String** for later use.
1. Create a storage account for some of the internal Functions processing:
   1. Grab **Storage Account > Keys > Show Keys > Connection string** for later use.

### Messaging and Eventing (a quick aside)

You may be wondering "why are we using Service Bus instead of Event Hub or Event Grid?" Great question! There are three primary eventing/messaging services in Azure. Microsoft provides a great [article to help understand the differences](https://docs.microsoft.com/en-us/azure/event-grid/compare-messaging-services), but this is how I think about it:

- Event Hub - Used for massive event data ingestion. Supports AMQP. Consumers control their own checkpoint of what events they read across partitions (events aren't consumed). Supports Kafka. Requires idempotent processing.
- Event Grid - Used for distributed, reactive systems. Consumers create subscriptions on topics and define a delivery endpoint. Event batches are sent as web requests.
- Service Bus - Used for business critical messaging. Supports AMQP. Supports queues or pub/sub topics. Consumers read individual messages which are removed after processing.

In this solution we're using Service Bus because of the guaranteed delivery, extremely fast processing, queue messaging support, and very low probability of duplicate processing. In all frankness, you could use any of the three.

## Building the Solution

Now we get to the fun part: building out the processing pipeline for subscription payments.

### Process New Subscriptions

Whenever a new subscription is created by the API, a new document is added to the Cosmos database. Cosmos has a Change Feed feature that allows consumers to listen to these document changes. We're going to trigger a ProcessNewSubscription Function whenever a subscription is added to the database.

1. Add the Service Bus Functions package by running the following on the command line in the same directory as your **.csproj** file.

```bash
dotnet add package Microsoft.Azure.WebJobs.Extensions.ServiceBus
```

1. Add a PaymentDay property to the Subscription model to represent which day of the month a subscription payment should be made.

```csharp
[JsonProperty("paymentDay")]
public int? PaymentDay { get; set; }
```

1. Add/update the following values in **local.settings.json**

```json
"SubscriptionLeaseCollection": "SubscriptionLeases",
"AzureWebJobsStorage": "[storage_account_connection_string]",
"ServiceBusConnection": "[service_bus_namespace_connection_string",
"PaymentQueue": "payment-queue"
```

1. Create a new file named **Handlers/ProcessSubscriptionHandler.cs** to hold our new functions.
1. Create a new Function named **ProcessNewSubscription** that is triggered from the Cosmos DB change feed.

```csharp
[FunctionName("ProcessNewSubscription")]
public static async Task ProcessNewSubscription(
    [CosmosDBTrigger(
        databaseName: "%DatabaseName%",
        collectionName: "%SubscriptionCollection%",
        ConnectionStringSetting = "CosmosDBConnection",
        LeaseCollectionName = "%SubscriptionLeaseCollection%",
        CreateLeaseCollectionIfNotExists = true)] IReadOnlyList<Document> subscriptionDocuments,
    [CosmosDB("%DatabaseName%",
        "%SubscriptionCollection%",
        ConnectionStringSetting = "CosmosDBConnection")] IAsyncCollector<Subscription> subscriptionsOutput,
    [ServiceBus("%PaymentQueue%", Connection = "ServiceBusConnection")] IAsyncCollector<Subscription> paymentsOutput,
    ILogger log)
{
    foreach (var subscriptionDocument in subscriptionDocuments)
    {
        var subscription = JsonConvert.DeserializeObject<Subscription>(subscriptionDocument.ToString());

        // Only process new subscriptions.
        if (!subscription.PaymentDay.HasValue)
        {
            log.LogInformation($"Subscription {subscription.Id} created for customer {subscription.CustomerId}");
            subscription.PaymentDay = subscription.CreatedTimestamp.Day;
            await Task.WhenAll(subscriptionsOutput.AddAsync(subscription), paymentsOutput.AddAsync(subscription));
        }
    }
}
```

### Retrieving Subscriptions Daily

The next step in setting up our system is to retrieve subscriptions when it is time to process their monthly payment. To do this, we'll create a new Function called **ProcessDailySubscriptions** in the **ProcessSubscriptionHandler** class and use a timer trigger. We could use a Cosmos input binding with a SQL query to retrieve all the subscriptions for today, but the query would get pretty gnarly since months don't have the same number of days and Cosmos doesn't have a robust set of Date functions for us to use. Instead, we'll have the input binding give us the Cosmos DocumentClient class so we can craft our own logic for retrieving subscriptions. (If I was using a different language, I would need to use the Cosmos library for that language to do this part instead of an input binding. The in-process version of C# Functions gives us a little more flexibility.)

```csharp
[FunctionName("ProcessDailySubscriptions")]
public static async Task ProcessDailySubscriptions(
    [TimerTrigger("0 0 0 * * *")] TimerInfo timerInfo,
    [CosmosDB("%DatabaseName%",
        "%SubscriptionCollection%",
        ConnectionStringSetting = "CosmosDBConnection")] DocumentClient client,
    [ServiceBus("%PaymentQueue%", Connection = "ServiceBusConnection")] IAsyncCollector<Subscription> paymentsOutput,
    ILogger log)
{
    var databaseName = Environment.GetEnvironmentVariable("DatabaseName");
    var subscriptionCollection = Environment.GetEnvironmentVariable("SubscriptionCollection");

    var query = client.CreateDocumentQuery<Subscription>(
        UriFactory.CreateDocumentCollectionUri(databaseName, subscriptionCollection),
        new FeedOptions { EnableCrossPartitionQuery = true })
        .Where(s => s.IsActive)
        .AsQueryable();

    // Handle end-of-month processing.
    var subscriptionQuery = (DateTime.Today.Day == DateTime.DaysInMonth(DateTime.Today.Year, DateTime.Today.Month)
        ? query.Where(s => s.PaymentDay >= DateTime.Today.Day)
        : query.Where(s => s.PaymentDay == DateTime.Today.Day))
        .AsDocumentQuery();

    while (subscriptionQuery.HasMoreResults)
    {
        foreach (var subscriptionDocument in await subscriptionQuery.ExecuteNextAsync())
        {
            var subscription = JsonConvert.DeserializeObject<Subscription>(subscriptionDocument.ToString());
            log.LogInformation($"Subscription {subscription.Id} payment requested for customer {subscription.CustomerId}");
            await paymentsOutput.AddAsync(subscription);
        }
    }
}
```

### Process Payments

Now we need to process the payment requests coming from our Service Bus queue. We're going to pretend like we're calling a payment provider in our code. Obviously, there would be a bit more logic here if we were actually implementing this.

1. Create a new collection in Cosmos called **Payments** with a partition key of **/customerId**. (We could get into a long discussion around data modeling in Cosmos and how partitions work but I'll save that for another post.)
1. Add the following value to your **local.settings.json** file

```json
"PaymentCollection": "Payments"
```

1. Create a new handler file called **ProcessPaymentHandler.cs**
1. Add the following function to **ProcessPaymentHandler.cs**

```csharp
[FunctionName("ProcessSubscriptionPayment")]
public static async Task ProcessSubscriptionPayment(
    [ServiceBusTrigger("%PaymentQueue%", Connection = "ServiceBusConnection")] Subscription subscription,
    [CosmosDB("%DatabaseName%",
        "%PaymentCollection%",
        ConnectionStringSetting = "CosmosDBConnection")] IAsyncCollector<Payment> paymentsOutput,
    ILogger log)
{
    var payment = new Payment
    {
        Id = Guid.NewGuid(),
        CustomerId = subscription.CustomerId,
        SubscriptionId = subscription.Id,
        Amount = subscription.Level switch
        {
            SubscriptionLevel.Basic => 0.99m,
            SubscriptionLevel.Standard => 2.99m,
            SubscriptionLevel.Premium => 5.99m,
            _ => throw new ArgumentOutOfRangeException()
        },
        CreatedTimestamp = DateTime.UtcNow
    };

    // Fake payment processing here.

    await paymentsOutput.AddAsync(payment);
    log.LogInformation($"Subscription {subscription.Id} payment processed for customer {subscription.CustomerId}");
}
```

### Payments API

Let's add in a couple of API routes to retrieve Payments.

1. Create a new handler file called **PaymentApiHandler.cs**
1. Add the following function to retrieve payments for a specific customer.

```csharp
[FunctionName("GetCustomerPayments")]
public static IActionResult GetCustomerPayments(
    [HttpTrigger(
        AuthorizationLevel.Anonymous,
        "get",
        Route = "customers/{customerId}/payments")] HttpRequest req,
    [CosmosDB("%DatabaseName%",
        "%PaymentCollection%",
        ConnectionStringSetting = "CosmosDBConnection",
        SqlQuery = "SELECT * FROM p where p.customerId = {customerId}")] IEnumerable<Payment> payments,
    string customerId,
    ILogger log)
{
    log.LogInformation($"{payments.Count()} payments retrieved for customer {customerId}");

    return new OkObjectResult(payments);
}
```

1. Add the following function to retrieve payments for a specific subscription.

```csharp
[FunctionName("GetSubscriptionPayments")]
public static IActionResult GetSubscriptionPayments(
    [HttpTrigger(
        AuthorizationLevel.Anonymous,
        "get",
        Route = "customers/{customerId}/subscriptions/{subscriptionId:guid}/payments")] HttpRequest req,
    [CosmosDB("%DatabaseName%",
        "%PaymentCollection%",
        ConnectionStringSetting = "CosmosDBConnection",
        SqlQuery = "SELECT * FROM p where p.customerId = {customerId} AND p.subscriptionId = {subscriptionId}")] IEnumerable<Payment> payments,
    Guid subscriptionId,
    string customerId,
    ILogger log)
{
    log.LogInformation($"{payments.Count()} payments retrieved for subscription {subscriptionId} for customer {customerId}");

    return new OkObjectResult(payments);
}
```

## Wrap Up

Now we have a fully functioning subscription processing pipeline using Azure Functions, Azure Cosmos DB, Azure Storage, and Azure Service Bus.

The complete code can be found at <https://github.com/joelwaymack/subscription-processing-functions-csharp>.
