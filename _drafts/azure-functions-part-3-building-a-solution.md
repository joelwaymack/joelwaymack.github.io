---
title: "Azure Functions Part 3 - Building a Solution"
categories:
  - Tech
tags:
  - Azure Functions
  - Azure
---

In the previous posts, we looked at [the basics of Azure Functions](https://waymack.net/azure-functions-part-1-the-basics) and [the basics of Azure Functions development](https://waymack.net/azure-functions-part-2-developing-functions). In this post, we are going build out a full Function App based solution using the project we generated in part 2.

## Solution Overview

I always recommend learning a new language or framework using a real-world scenario because it helps you understand the intricacies of the technology. Azure Functions is no different. Looking at a full solution will be more helpful than a "Hello, world!" scenario. To that end, we're going to build out the following solution:

![Functions Solution](/assets/images/azure_functions/functions_architecture.drawio.svg)

Let's walk through what all is going on in this architecture. Overall, this is a simple subscription system that allows users to create new subscriptions for an online service and then bills them on a monthly interval. This may look complicated but it's actually pretty straightforward to set up. Here is the process flow:

1. A user creates a new subscription with a call to **POST /user/{userId}/subscriptions** with the subscription information. This subscription is saved to the Cosmos DB.
1. The **ProcessNewSubscriptions** Function is triggered from the Cosmos DB change feed and sets up the subscription for recurring payments. It also sends a payment request to process the subscription for the first time.
1. The **RetrieveDailySubscriptions** Function runs daily to retrieve the day's active recurring subscriptions and send payment requests.
1. The **ProcessPayments** Function receives payment requests from the Service Bus Queue, processes the payments, and saves the payment information to Cosmos DB.

We also have a **GET /user/{userId}/subscriptions** API endpoint for getting all of a user's subscriptions and a **DELETE /user/{userId}/subscriptions/{id}** endpoint for soft deleting subscriptions.

### Architectural Decisions

Before we can jump in and start beep-booping away, we'll need to make a few architectural decisions.

First, to keep from having to install lots of local dependencies, we'll deploy all the components/services into Azure. That way we can do local functions development on our machine but still have a high degree of confidence that everything will work correctly when we deploy the app out in Azure.

Second, we'll group all of our functions for this solution into a single Function App. In a production system, we may split these out into separate Function Apps depending on scaling and throughput concerns.

## Infrastructure setup

Before we start developing our functions, we'll **only** set up the dependent resources in Azure that we need at this point. Copy down the connection string or SAS for each of these resources to use later in our Function App:

* Cosmos DB (Core API) - Used to persist data in a JSON document format.
  * Connection string location: **Cosmos DB Account > Settings > Keys > Primary Connection String**
* Service Bus Namespace & Queue - Holds payment messages until they are processed.
  * Connection string location: **Service Bus Namespace > Settings > Shared access policies > RootManageSharedAccessKey > Primary Connection String**
* Storage Account - Holds the deployment files and metadata for the Function App.
  * Connection string location: **Storage account > Security + networking > Access keys > key1 > Connection string**

![Dependent resources for local development](/assets/images/azure_functions/local_resources.png)

## Building the Solution

Now we get to the fun part: building a full solution with a Function App at the center.

### Creating the Function App

The first step in creating a Function App is to create a new directory and open it in Visual Studio Code. As long as we have the [Visual Studio Code Azure Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-node-azure-pack) installed, things will be pretty simple.

1. Select the Azure Extension in the left menu.
1. Find the Functions section of the Extension and select the **Create New Project...** button (it looks like a folder with a tiny lightning bolt).
1. VS Code will guide you through setting up the project. Here are my settings:
    1. Folder: The current folder
    1. Language: C#
    1. Runtime: .NET 6
    1. Template: HTTP trigger
    1. Function name: CreateSubscription
    1. Namespace: Company.Function
    1. AccessRights: Anonymous

At this point, our Function App project is set up. If you hit **F5**, it should start your Function App and you can navigate to **localhost:7071/api/CreateSubscription** to see the default code execute.
