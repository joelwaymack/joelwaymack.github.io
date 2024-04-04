---
title: Azure Functions Part 2 - Developing Web APIs
description: How to develop web APIs using Azure Functions HTTP triggers
pubDate: 2022-04-25
categories:
  - Tech
tags:
  - Azure Functions
  - Azure
heroImage: /images/azure_functions/header.png
---

In the previous post, we looked at [the basics of Azure Functions](https://waymack.net/azure-functions-part-1-the-basics). In this post, we are going to jump in and create a Function App with web API endpoints. The entire Function App can be found at <https://github.com/joelwaymack/subscription-processing-functions-csharp>.

## Tooling

There are multiple tooling options for building a Function App. To try and keep things as generic as possible for your desired operating system, editor, and language, I generally recommend the following tools:

* [Visual Studio Code](https://code.visualstudio.com/) for code editing
  * [Azure Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-node-azure-pack)
  * [Rest Client Extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
* [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local) for CLI Functions setup
* The [language specific SDK/Runtime](https://docs.microsoft.com/en-us/azure/azure-functions/supported-languages#languages-by-runtime-version) you want to use (I plan on using C# and .NET 6.0 for my Function App but you are more than welcome to use whatever you would like.)
* The [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) to set up resources in Azure

Sometimes you will need additional tools for local development depending on the triggers and bindings you want to use like the [Cosmos DB Emulator](https://docs.microsoft.com/en-us/azure/cosmos-db/local-emulator) for local DB development, [Azurite](https://github.com/Azure/Azurite) for local storage development, or [Storage Explorer](https://docs.microsoft.com/en-us/azure/vs-azure-tools-storage-manage-with-storage-explorer) to manipulate BLOBs in local storage. You can also stand up dependent resources for development directly in Azure. Many times, that's the easiest route.

## Solution Overview

I always recommend learning a new language or framework using a real-world scenario because it helps you understand the intricacies of the technology. Azure Functions is no different. Looking at a full solution will be more helpful than a "Hello, world!" scenario. To that end, we're going to build out the following solution:

![Functions Solution](/images/azure_functions/functions_architecture.drawio.svg)

For this post, we're going to focus on the web API portion of the solution which includes three HTTP triggered Functions and the Cosmos database for data persistence. These three Functions are:

* CreateSubscription - Allows a customer to create a new product subscription (think about a Netflix subscription).
* GetSubscriptions - Get all subscriptions for a customer.
* DeleteSubscription - Remove a subscription from a customer with a [soft delete](https://en.wiktionary.org/wiki/soft_deletion).

## Generating a Function App

Now we get to the fun part: building our Function App. We're going to stay fairly high-level in our development, but this should help demonstrate some of the nuances of Function App development.

### Creating the Function App

The first step in creating a Function App is to create a new directory and open it in VS Code. As long as we have the [VS Code Azure Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-node-azure-pack) installed, things will be pretty simple.

1. Select the Azure Extension in the left extension menu.
1. Find the Functions section of the Extension and select the **Create New Project...** button (it looks like a folder with a tiny lightning bolt).
1. VS Code will guide you through setting up the project. Here are my settings:
    1. Folder: The current folder
    1. Language: C#
    1. Runtime: .NET 6
    1. Template: HTTP trigger
    1. Function name: CreateSubscription
    1. Namespace: Company.Function
    1. AccessRights: Anonymous

At this point, our Function App project is set up. If you hit **F5**, it should start your Function App and you can navigate to **localhost:7071/api/CreateSubscription** to see the default code execute. It's simply an API endpoint that will accept a **name** query string parameter and send back a string.

### Examining the default code

When we selected an **HTTP trigger** for our first Function, a **CreateSubscription.cs** file was generated with a single Function inside of it. Let's examine the code:

```csharp
[FunctionName("CreateSubscription")]
public static async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
    ILogger log)
{
    log.LogInformation("C# HTTP trigger function processed a request.");

    string name = req.Query["name"];

    string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
    dynamic data = JsonConvert.DeserializeObject(requestBody);
    name = name ?? data?.name;

    string responseMessage = string.IsNullOrEmpty(name)
        ? "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
        : $"Hello, {name}. This HTTP triggered function executed successfully.";

    return new OkObjectResult(responseMessage);
}
```

Here are a few things to note:

* The **FunctionName** attribute defines what name the Function will have inside of the app. This is also how the Functions Host knows that this method is a Function within the app.
* The method has two parameters. The first parameter defines the Function trigger through an **HttpTrigger** attribute. This definition tells the Functions Host to execute this Function when an HTTP request arrives with a verb of either **GET** or **POST** to the default route for this Function: **/api/CreateSubscription**. (Don't worry about the **AuthorizationLevel** at this point.)
* The second parameter is the Functions logger that is using default logging categories for the Function App. Use this logger for any logging you want to do.
* The **HttpRequest** parameter contains all the information for the request that triggered the Function execution such as query string parameters, the request body, headers, and so forth.
* The default Function method is async so we can use [async/await semantics](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/async/task-asynchronous-programming-model). You can always remove async and the Task return type to make it a synchronous method.
* The return type for this Function is an **IActionResult**. This will define the HTTP response that gets sent back to the requestor. .NET has a number of built-in types for defining an HTTP response like the **OkObjectResult** that gets returned from this method.
* If I wanted to add any input or output bindings, I would add them as method parameters. They would have an attribute that looks a lot like the trigger attribute for the first parameter.

## Organizing a Function App

The default project code isn't well organized, so I generally create a better directory model for building out my Function Apps. Almost all of my Function Apps have the following two directories:

* Handlers - This directory contains all of the classes that hold my Function methods (like Controllers in MVC style apps). I generally create a 'Handler' class for each model/domain object, for a set of HTTP APIs, or the like. Handler is the common term in event-driven-processing for a method/function that 'handles' an event execution.
* Models - This directory holds all of the domain models for my Function App.

Sometimes I also add a [Startup.cs](https://docs.microsoft.com/en-us/azure/azure-functions/functions-dotnet-dependency-injection#register-services) file in the root project directory to include dependency injection or change serializer settings for my Function App. At this point in our solution, we don't need one.

### Creating the Model

At this point, we need to define our data model. I'm going to create a **Subscription** class and a **SubscriptionType** enum and put them in the **Models** directory.

```csharp
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Company.Function.Models;

[JsonConverter(typeof(StringEnumConverter))]
public enum SubscriptionLevel
{
    Basic,
    Standard,
    Premium
}
```

```csharp
using System;
using Newtonsoft.Json;

namespace Company.Function.Models;

public class Subscription
{
    [JsonProperty("id")]
    public Guid Id { get; set; }
    [JsonProperty("customerId")]
    public string CustomerId { get; set; }
    [JsonProperty("level")]
    public SubscriptionLevel Level { get; set; }
    [JsonProperty("createdTimestamp")]
    public DateTime CreatedTimestamp { get; set; }
    [JsonProperty("isActive")]
    public bool IsActive { get; set; } = true;
}
```

### Infrastructure setup

We'll need a Cosmos DB to persist our data. To do this:

1. Jump into the Azure Portal and create a Cosmos DB Account with the Core API. (you can use the Free Tier!)
1. In **Cosmos DB Account > Data Explorer > New Container**
    1. Database id: **Sales**
    1. Database throughput: Manual
    1. Required RU/s: 400
    1. Container id: **Subscriptions**
    1. Partition key: **/customerId**
1. Grab the connection string at **Cosmos DB Account > Settings > Keys > Primary Connection String** for the local settings.

### Local Settings

Before we can write our Functions, we need to add in some local settings. Settings are injected as environment variables into our locally running Function App and can be found in the **Values** section of the **local.settings.json** file. I'm going to add in the Cosmos DB settings so the file looks like this:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet",
    "CosmosDBConnection": "[connection string]",
    "DatabaseName": "Sales",
    "SubscriptionCollection": "Subscriptions"
  }
}
```

### Creating the Functions

We can now build each of the Functions that correspond to the three API endpoints. Each of the binding types within Azure Functions (beyond HTTP and Timer triggers) have unique Nuget packages. We'll need to add the [Cosmos DB Nuget package](https://www.nuget.org/packages/Microsoft.Azure.Functions.Worker.Extensions.CosmosDB/) to ensure we can use the Cosmos bindings.

```bash
dotnet add package Microsoft.Azure.WebJobs.Extensions.CosmosDB
```

#### Creating a Subscription

The first Function we'll build is the CreateSubscription Function. This endpoint will correspond to a **POST /api/customers/{customerId}/subscriptions** request with a body containing a JSON subscription. All the Function does is take the request body, serialize it into a C# object, set the appropriate properties, and save it to the database using a Cosmos DB output binding.

```csharp
public static async Task<IActionResult> CreateSubscription(
    [HttpTrigger(
        AuthorizationLevel.Anonymous,
        "post",
        Route = "customers/{customerId}/subscriptions")] HttpRequest req,
    [CosmosDB("%DatabaseName%",
        "%SubscriptionCollection%",
        ConnectionStringSetting = "CosmosDBConnection")] IAsyncCollector<Subscription> subscriptionsOutput,
    string customerId,
    ILogger log)
{
    string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
    var subscription = JsonConvert.DeserializeObject<Subscription>(requestBody);
    subscription.Id = Guid.NewGuid();
    subscription.customerId = CustomerId;
    subscription.CreatedTimestamp = DateTime.UtcNow;
    await subscriptionsOutput.AddAsync(subscription);

    log.LogInformation($"Subscription {subscription.Id} created for customer {subscription.customerId}");

    return new OkObjectResult(subscription);
}
```

Note the binding expression in the Cosmos DB output binding. The _DatabaseName_ and _SubscriptionCollection_ parameters are coming from environment variables. (So is _CosmosDBConnection_ but that is required to come as an environment variable so it doesn't need the binding expression syntax.)

Also note that a route parameter _customerId_ is defined and that it is also passed in as a Function parameter so it can be used in the Function body.

The last thing to consider is that my Function is short, sweet, and to the point. You'd likely add in some error checking or the like, but I want to emphasize LEAN Functions. If you're coming from an n-tier architecture background, you might have a tendency to over-engineer things. Having additional classes to help with some of the operations is fine, but the unit of execution is a Function, so keep it simple and lean.

### Getting Subscriptions

Next, we'll retrieve all of the subscriptions for a specific customer. This endpoint will correspond to **GET /api/customers/{customerId}/subscriptions**.

```csharp
[FunctionName("GetSubscriptions")]
public static IActionResult GetSubscriptions(
    [HttpTrigger(
        AuthorizationLevel.Anonymous,
        "get",
        Route = "customers/{customerId}/subscriptions")] HttpRequest req,
    [CosmosDB("%DatabaseName%",
        "%SubscriptionCollection%",
        ConnectionStringSetting = "CosmosDBConnection",
        SqlQuery = "SELECT * FROM s where s.customerId = {customerId} AND s.isActive")] IEnumerable<Subscription> subscriptions,
    string customerId,
    ILogger log)
{
    log.LogInformation($"{subscriptions.Count()} subscriptions retrieved for customer {customerId}");

    return new OkObjectResult(subscriptions);
}
```

In this Function, you can see we use the _customerId_ coming in from the HTTP trigger as a binding expression in our Cosmos DB input binding. A simple SQL-ish query gives us the results we need and we simply return those to the caller.

### Delete a Subscription

For our final API endpoint, we'll delete a subscription using a soft delete. This endpoint will correspond to **DELETE /api/customers/{customerId}/subscriptions/{subscriptionId}**.

```csharp
[FunctionName("DeleteSubscription")]
public static IActionResult DeleteSubscription(
    [HttpTrigger(
        AuthorizationLevel.Anonymous,
        "delete",
        Route = "customers/{customerId}/subscriptions/{subscriptionId:Guid}")] HttpRequest req,
    [CosmosDB("%DatabaseName%",
        "%SubscriptionCollection%",
        ConnectionStringSetting = "CosmosDBConnection",
        Id = "{subscriptionId}",
        PartitionKey = "{customerId}")] Subscription subscription,
    [CosmosDB("%DatabaseName%",
        "%SubscriptionCollection%",
        ConnectionStringSetting = "CosmosDBConnection")] IAsyncCollector<Subscription> subscriptionsOutput,
    string customerId,
    Guid subscriptionId,
    ILogger log)
{
    if (subscription == null)
    {
        return new NotFoundResult();
    }

    subscription.IsActive = false;
    subscriptionsOutput.AddAsync(subscription);

    log.LogInformation($"Subscription {subscriptionId} deleted for customer {customerId}");

    return new OkResult();
}
```

Notice we have an input and and output Cosmos DB binding. So we retrieve the record we want, modify it, and then save it back. We're also using a route constraint so that the _subscriptionId_ has to conform to a Guid (Uuid) format.

## Wrap up

We now have a fully functioning API built with Azure Functions. The input and output bindings make it incredibly simple to build a RESTful-ish API when we use Cosmos DB. Jump into the next post in this series, [Building a Processing Pipeline](https://waymack.net/azure-functions-part-3-building-a-processing-pipeline/), to learn more!

The complete code can be found at <https://github.com/joelwaymack/subscription-processing-functions-csharp>.
