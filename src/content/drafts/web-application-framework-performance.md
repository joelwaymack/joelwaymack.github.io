---
title: "Web Application Framework Performance"
categories:
  - Tech
tags:
  - Java
  - Spring
  - C#
  - ASP.NET Core
  - JavaScript
  - Express.js
  - Node.js
toc: true
toc_label: "Web App Performance"
toc_sticky: true
header:
  image: /assets/images/web_perf/header.jpg
  teaser: /assets/images/web_perf/header.jpg
---

Web applications power the world. Whether it's an API that a phone app accesses as it's backend, or a web app hosting an organization's newest business tool, web applications are ubiquitous in the modern world. When building new web apps, it's common to simply stick with the language or framework that you're familiar with. The ability to quickly build and deploy an application is incredibly important for many organizations.

One of the big problems I see among developers is they rarely assess the technology choices they make when building new applications. But when building a new system or solution, taking a good look at the technology stack is vital for the performance and maintainability of the solution.

My goal in this post is to analyze the current version of a few popular web application frameworks and see what their performance and resource utilization characteristics look like.

## The App

To try and keep my analysis consistent, I'm going to build a common Web API that manages a set of products. Each API will reach out to its own SQL Server database for storing, retrieving, and modifying Product data to simulate a real-world scenario. While there are many data access libraries and frameworks, I'm going to try and use the most common for each Web Framework since most developers would likely use whatever is most common.

## The Frameworks

I've narrowed my assessment down to three common frameworks with their most common language: Spring Boot with Java, ASP.NET Core with C#, and Express.js (Node.js) with JavaScript. These are all very heavily used frameworks in the software development industry and represent a vast majority of web applications that companies build.

To ensure I'm getting the best results, I'm going to utilize the most recent versions of these frameworks and languages:

* [Spring Framework 6](https://spring.io/projects/spring-framework) with [Java 17 using the Microsoft Build of the OpenJDK](https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-17)
* [ASP.NET Core 7](https://learn.microsoft.com/en-us/aspnet/core/introduction-to-aspnet-core?view=aspnetcore-7.0) with [C# 11](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11)
* [Express.js 4.X](http://expressjs.com/) with [Node.js 18](https://nodejs.org/en/)
* [Flask 2.X](https://pypi.org/project/Flask/) and [Python 3.X](https://www.python.org/)
* [Gin 1.8](https://gin-gonic.com/) and [Go 1.19](https://go.dev/)

