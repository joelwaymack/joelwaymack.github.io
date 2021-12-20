---
title: "Azure Functions Part 2 - Developing Functions"
categories:
  - Tech
tags:
  - Azure Functions
  - Azure
---

In the previous post, we looked at [the basics of Azure Functions](https://waymack.net/azure-functions-part-1-the-basics). In this post, we are going to jump in and build a Function App.

## Tooling

There are multiple tooling options for building a Function App. To try and keep things as generic as possible for your desired operating system, editor, and language, I generally recommend the following tools:

* [Visual Studio Code](https://code.visualstudio.com/) for code editing
* [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local) for CLI Functions setup
* The [language specific SDK/Runtime](https://docs.microsoft.com/en-us/azure/azure-functions/supported-languages#languages-by-runtime-version) you want to use (I plan on using C# and .NET 6.0 for my Function App by you are more than welcome to use whatever you would like.)
* The [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) to set up resources in Azure

Sometimes you will need additional tools for local development depending on the triggers and bindings you want to use like the [Cosmos DB Emulator](https://docs.microsoft.com/en-us/azure/cosmos-db/local-emulator) for local DB development, [Azurite](https://github.com/Azure/Azurite) for local storage development, or [Storage Explorer](https://docs.microsoft.com/en-us/azure/vs-azure-tools-storage-manage-with-storage-explorer) to manipulate BLOBs in local storage. You can also stand up dependent resources for development directly in Azure. Many times, that's the easiest route.

## Solution Overview

I always recommend learning a new language or framework using a real-world scenario because it helps you understand the intricacies of the technology. Azure Functions is no different. Looking at a full solution will be more helpful than a "Hello, world!" scenario. To that end, we're going to build out the following solution:

![Functions Solution](/assets/images/azure_functions/functions_solution_architecture.png)

Let's walk through what all is going on in this architecture. This may look complicated but it's actually pretty straightforward to set up.

1. An HTTP Post request with an order is sent to the Create Order function. (You can query the status of an order at any time with the Get Order function.)
1. The new order is saved to the Sales database Orders container.
1. The Process Order function is triggered with the change feed from the Orders container.
1. The new order is sent on to the Order Events Event Grid topic.
1. The Process Payment function is triggered to do payment processing.
1. An update is sent to the Orders container for the order that now has a processed payment.
1. The Process Order function is triggered with the change feed from the Orders container.
1. The payment-processed order is sent on to the Order Events Event Grid topic.
1. The Process Shipping function is triggered and creates a new invoice.
1. The invoice is stored in the invoices container in the Sales storage account.
1. An update is sent to the Orders container for the order that has been shipped.

### Architectural Decisions

Before we can jump in and start beep-booping away, we'll need to make a few architectural decisions.

First, to keep from having to install lots of local dependencies, we'll deploy all the components into Azure except for the Function App. That way we can do local functions development on our machine but still have a high degree of confidence that everything will work correctly.

Second, we'll group all of our functions for this solution into a single Function App. In a true productionized system, we may split these out into separate Function Apps depending on scaling and throughput concerns.

## Infrastucture setup

Before we start developing our functions, we'll need to set up the dependent resources in Azure.