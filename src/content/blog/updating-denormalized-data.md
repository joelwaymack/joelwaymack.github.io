---
title: Updating Denormalized Data
description: How to update denormalized data in a non-relational database with Durable Azure Functions
pubDate: 2024-05-02
categories:
  - Tech
tags:
  - Azure
  - Azure Functions
  - Azure Cosmos DB
  - Azure Durable Functions
heroImage: /images/denormalized_updates/header.png
---

As I've continued to progress in my career, I've found that I choose [relational databases](https://en.wikipedia.org/wiki/Relational_database) less and less for my projects because I like controlling the shape of my data through code instead of through database schemas. This generally means I choose a non-relational, non-schema-specific database (generally a [document database](https://en.wikipedia.org/wiki/Document-oriented_database)) for most of my projects. One challenge I run into on a regular basis is how to update [denormalized](https://en.wikipedia.org/wiki/Denormalization) data in my document database as canonical documents are updated.

In this post, I'm going to show how to update denormalized data in an Azure Cosmos DB when using the API for NoSQL by running an Azure Durable Function orchestration. While I'm demonstrating this on a specific tech stack, this pattern can be used with almost any database that has a change feed mechanism in conjunction with a job orchestration platform.

All of the code can be found [in this repo](https://github.com/joelwaymack/cosmos-db-updates-func).

## Denormalization

Most developers are familiar with relational databases and [normalized data](https://en.wikipedia.org/wiki/Database_normalization) models. For instance, an Order table might have a foreign key constraint to a customer table so you can know which customer the order is associated with. In this scenario, you include the customer's Id as a field in the Order table allowing you to join across the Order and Customer tables to get all the data you might need for fulfilling an order. Normalization of data like this is generally considered write-efficient but read-inefficient since joins across tables are considered computationally expensive.

![Normalized Entity Relationship Diagram](/images/denormalized_updates/relational-erd.png)

In a non-relational document database, we generally structure the documents in a denormalized fashion to allow for expensive writes but efficient reads. In this type of situation, we might add the customer's name to the order document making it easier to display important order information through the retrieval of a single document. In this scenario, the customer's name is a denormalized data element since it is spread across multiple documents. We generally refer to the customer document as the canonical source of truth from which the denormalized data is derived. (If you want to read more about modeling data in a non-relational database, check out [this article](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/modeling-data).) 

![Normalized Entity Relationship Diagram](/images/denormalized_updates/denormalized-erd.png)

## Updating Denormalized Data

Denormalized data makes reads extremely efficient but it makes writes to canonical documents very expensive since we need to go back through all the denormalized data and update it. For instance, if the customer changes their name, we need to go back through all of the orders and change their name in each order to match the canonical source of truth found in the updated customer document.

To do this, most document databases (and many other types of databses) provide some sort of change feed that allows us to run code based on a document change event. In Cosmos DB, a [change feed](https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed) is exposed for most of the APIs, including the document oriented NoSQL API that I generally use.

### Durable Functions

To tie into the change feed and orchestrate all the updates that need to happen, I'm going to use Azure Functions with the Durable Functions extension. Azure Functions already has a trigger for the Cosmos DB NoSQL API change feed so I can trigger execution based on document updates in the database.

We're using the Durable Functions extension to orchestrate all of the updates that need to happen across all the documents with denormalized data. The [fan out/fan](https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed) in pattern in Durable Functions is an excellent choice for a massive amount of updates in a short period of time.

![Fan out/fan in](/images/denormalized_updates/fan-out-fan-in.png)

### Triggering From the Change Feed

The first thing we need to do is trigger our Durable Function off of a Cosmos DB change feed event. To do this, we create a Function using the CosmosDBTrigger. This Function launches our Durable Function orchestration once for each changed customer record.

```csharp
[Function("ProcessCustomerChange")]
public async Task ProcessCustomerChange([CosmosDBTrigger(
        databaseName: "%DatabaseName%",
        containerName: "%CustomerContainerName%",
        Connection = "CosmosConnectionString",
        LeaseContainerName = "leases",
        CreateLeaseContainerIfNotExists = true)] IReadOnlyList<Customer> customers,
        [DurableClient] DurableTaskClient durableClient)
{
    if (customers != null && customers.Count > 0)
    {
        _logger.LogInformation("Documents modified: " + customers.Count);
        foreach (var customer in customers)
        {
            var instanceId = await durableClient.ScheduleNewOrchestrationInstanceAsync("UpdateCustomerDenormalizedData", customer);
            _logger.LogInformation($"Started orchestration for customer '{customer.Id}' with orchestration of '{instanceId}'.");
        }
    }
}
```

### Running the Orchestration

Every Durable Function has an Orchestrator Function that controls the execution of the activities needed to complete the orchestration. The Activity Functions are executed and tracked using Azure Storage Queues and Tables behind the scenes. Luckily, we don't have to understand what goes on behind the scenes to use Durable Functions.

Our Orchestrator Function has two types of activities it calls. The first retrieves all of the orders that need to be updated by retrieving all of the orders associated with the updated customer document. The second launches an Activity Function for each order and does the update operation. It's important to wait until all of the activities finish so we complete the orchestration once all of the activities finish.

```csharp
[Function("UpdateCustomerDenormalizedData")]
public async Task UpdateCustomerDenormalizedData([OrchestrationTrigger] TaskOrchestrationContext context)
{
    var customer = context.GetInput<Customer>();

    if (customer == null)
    {
        _logger.LogWarning("Customer not found.");
        return;
    }

    var orders = await context.CallActivityAsync<List<Order>>("GetOrdersToUpdate", customer.Id);

    var updateTask = new List<Task>();
    foreach (var order in orders)
    {
        updateTask.Add(context.CallActivityAsync("UpdateOrderCustomer", Tuple.Create(order, customer)));
    }

    await Task.WhenAll(updateTask);
}
```

### Retrieving Orders Activity

The *GetOrdersToUpdate* Activity Function queries Cosmos for all of the order documents that have a customer Id matching the updated customer document and returns a list of those orders.

```csharp
[Function("GetOrdersToUpdate")]
public async Task<IList<Order>> GetOrdersToUpdate([ActivityTrigger] Guid customerId)
{
    _logger.LogInformation($"Getting orders to update for customer {customerId}");
    var query = new QueryDefinition("SELECT * FROM o WHERE o.customerId = @customerId")
        .WithParameter("@customerId", customerId);
    var filteredFeed = _orderContainer.GetItemQueryIterator<Order>(query);

    var orders = new List<Order>();
    while (filteredFeed.HasMoreResults)
    {
        var response = await filteredFeed.ReadNextAsync();
        orders.AddRange(response.Select(o => o));
    }

    _logger.LogInformation($"Found {orders.Count} orders to update for customer {customerId}");

    return orders;
}
```

### Updating Orders Activity

Our last activity updates a single order. This is where the fan out operation occurs and allows for massive parallelization.

```csharp
[Function("UpdateOrderCustomer")]
public async Task UpdateOrderCustomer([ActivityTrigger] Tuple<Order, Customer> updateData)
{
    _logger.LogInformation($"Updating order {updateData.Item1.Id} customer data");
    var order = updateData.Item1 with { CustomerFirstName = updateData.Item2.FirstName, CustomerLastName = updateData.Item2.LastName };
    await _orderContainer.ReplaceItemAsync(order, order.Id.ToString(), new PartitionKey(order.CustomerId.ToString()));
}
```

## Wrap Up

This type of pattern could be used for any type of data update, but it is especially useful in the case of denormalized data updates based on a canonical document changing in a non-relational database.

All of the code can be found [in this repo](https://github.com/joelwaymack/cosmos-db-updates-func).