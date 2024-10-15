---
title: Running Scheduled Jobs on Azure Functions
description: Patterns for running scheduled jobs using Azure Functions
pubDate: 2023-01-12
categories:
  - Tech
tags:
  - Azure
  - Azure Functions
  - Azure Durable Functions
heroImage: /images/scheduled_job/header.jpg
---

As teams move legacy systems out to Azure, or build new systems in Azure, a common processing scenario often arises: running a scheduled job. In this post we'll look at two ways to architect a resilient, scheduled processing pipeline using [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview).

## Scheduled Jobs

Scheduled, or recurring, time-triggered jobs are a pretty common way to do periodic processing. Think about these scenarios:

- A restaurant serves meals throughout the day and then calculates the inventory replacement needed at then end of the day based on the meals purchased.
- A monthly subscription service needs to check, at the beginning of the day, which customers it should send out its monthly subscription to.
- Every hour an accounting system needs to check and see what budgets have run over so it can send a list of budget overages to a manager for review.

![scheduled job](/images/scheduled_job/scheduled_processing.drawio.svg)

Recurring, time-based schedules are an easy way to create consistent processing patterns for certain business scenarios. Azure Functions, along with [Azure Service Bus](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview), or [Azure Durable Functions](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview?tabs=csharp) can make this type of processing scenario resilient and highly efficient.

### Legacy Caveat

It's important to note that legacy systems often used scheduled jobs to mimic real-time event processing. Mainframe systems didn't have effective event-driven processing options so they often used scheduled batch jobs to run a whole lot of processing on a regular basis. Likewise, many teams would use the [Windows Task Scheduler](https://en.wikipedia.org/wiki/Windows_Task_Scheduler) or [cron](https://en.wikipedia.org/wiki/Cron) to kick off periodic jobs to do some sort of processing.

In modern, event-driven systems, this can be an anti-pattern. Many teams that are migrating workloads to a cloud provider aren't thinking through the technology limitations that drove their original, legacy architectural design decisions. They simply think in a 1-to-1 migration of functionality.

Take the scenario where every hour an accounting system needs to check and see what budgets have run over so it can send a list of budget overages to a manager for review. The original system used the Windows Task Scheduler to launch a C# console app that queried the database for the list of budgets, then queried the ledger entries for each of those budgets, and finally sent an email to a manager with the list of budget overages.

In migrating something like this, I would ask the simple question, "Why don't we create budget aggregates as new ledger entries are made so we can always know if a budget is running over?" The goal is to identity and split out the real-time event component (a budget overage calculation based on a new ledger entry) versus the true recurring scheduled process (sending out an aggregated list of budget overages). That way the system is always in a "true" state and those overage calculations can be used for any other business processes, not just the manager email.

My suggestion is to always ask, "Is this the best process design?" when working with scheduled processes.

## Architectural Design

The [Azure Functions timer trigger](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer?tabs=in-process&pivots=programming-language-csharp) was created for this type of scheduled job processing scenario. It has a [NCRONTAB](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer?tabs=in-process&pivots=programming-language-csharp#ncrontab-expressions) recurrence expression that allows for a 1 second to 1 year recurrence schedule (possibly even longer depending on how you use the day-of-week field).

There are a few important details you need to know when creating scheduled jobs with the timer trigger:

- There are [default function execution time limits](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale#timeout) that can be modified in the Function App's host.json file up to the maximum limit. Function execution will be catastrophically terminated if this execution time limit is reached.
- There is no retry logic. If your Function terminates due to an error or Function execution time limit, the Function will not retry. It will simply be executed again when the timer schedule elapses.
- If your Function is still executing when the schedule timer elapses again, the new execution will not occur until the previous execution finishes.
- Only one instance of a timer triggered Function will be invoked, no matter how many instances of the Function App are running. This happens because one instance of the Function App will create a singleton lock file in the storage account to designate that it is the lock holder. It will periodically write the lock file again to ensure a non-expired lock. If the lock file is not written, another instance will pick it up.
- If the schedule recurrence is longer than 1 minute, the **Last Execution**, **Next Execution**, and **Last Updated** information will be saved as a file in your Function's designated storage account. If the singleton lock is acquired by a new instance, the new instance will check to see if it has missed the **Next Execution** time and, if so, immediately invoke the Function with an **IsPastDue** flag.

With these details in mind, we can talk a little about the architectural options for building a resilient scheduled job with Azure Functions.

### Stateful vs Stateless

There are two primary architectural patterns for scheduled jobs: stateful and stateless. If the the processing steps during job are asynchronous and discrete, then we can use a stateless pattern. If the steps during the process are synchronous and unified, then we need a stateful pattern. Let's take a look at some examples to understand the difference.

- We need to take all of the meals served at a restaurant throughout the day, calculate the inventory used, and then send a single inventory order to our vendor. Since the end step is a synchronous, unified step (send the needed inventory as an order to the vendor), this would require a stateful architectural pattern so we can converge the processing into a single, final step.
- We need to grab all the records in one employee database and then update the employee records in another database on an hourly basis so that the two stay in-sync. Since the end step is writing a set of records to the other database and we don't have a single, unified step at the end, this job can run in an asynchronous and stateless fashion.

Many times, the easiest way to identify the correct pattern is to look at the final step in the process. Is it a convergence action where we need all the data to do something (stateful) or could it be multiple, independent actions (stateless)?

### Stateless Job Pattern

The stateless job pattern is the easiest to implement. For simple jobs, we use the timer trigger to drop a message onto a queue and then use an Azure Function running off that queue message to actually process our job. Dropping a message on a Service Bus queue is ideal because we gain retries and we can queue up scheduled jobs in case one invocation takes slightly long than our scheduled time. This pattern is usually the best fit for teams looking to move existing scheduled jobs onto Azure Functions.

![simple stateless pattern](/images/scheduled_job/simple_stateless.drawio.svg)

For more complex jobs, I generally recommend using a series of queues, one for each step in our scheduled job. This allows for resilience in each step in our process and it allows for fanning out processing for better efficiency. Take the database synchronization example I mentioned above. In that scenario, a timer would kick off and drop the job message into the first queue. A Function would receive that message, query the first database, and then drop each row onto a subsequent queue as individual messages. Then a third Function could fan out and consume each message in a massively parallel operation to update single records in the second database. This type of fan-out operation, on top of the standard Service Bus features of retry logic, dead letter queuing, etc. makes this an ideal architecture. (Note, fan out operations are not specific to scheduled jobs, they're simply a common scenario).

![complex stateless pattern](/images/scheduled_job/complex_stateless.drawio.svg)

### Stateful Job Pattern

The stateful job pattern is a bit more complex and requires an additional technology framework: Durable Functions. Durable Functions use Azure Storage Queues and Azure Storage Tables to track the state of a workflow orchestration through various steps. There is an additional learning curve for Durable Functions but they are a powerful tool.

Durable Functions with a timer triggered orchestration is a great way to handle many scenarios. In the restaurant aggregation scenario above, a Timer Triggered Function would invoke a Durable Function Orchestrator to start the job workflow. The orchestrator would then call each activity Function for each step in the process. So we could fan out and calculate the inventory used for each receipt, then have an activity (fan in) that used the calculated results to aggregate the needed inventory replenishment, then another activity to send the order out to the vendor. (Once again, chaining activities and fan out/fan in operations are not unique to scheduled jobs, they're simply common scenarios).

![durable functions jobs](/images/scheduled_job/durable_function.drawio.svg)

The beauty in this type of stateful scheduled job is I can decrease job execution time but still have converged end steps in my process.

## Wrap Up

Those are the standard patterns I see for hosting scheduled jobs using Azure Functions. As a quick note, sometimes teams ask why they don't just run their code during the execution of the timer triggered Function. If you're unconcerned about retries if there is some sort of unhandled error (it's ok if we miss a scheduled processing point and wait for the next one), then go for it. The simpler, the better. But, by and large, I generally see teams wanting slightly more resilience than the timer trigger alone provides.
