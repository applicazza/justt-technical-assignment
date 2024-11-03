## Description

Technical assignment for blog posts manager

### Overview
Create a NestJS application that interfaces with JSONPlaceholder API to manage blog
posts. The application should implement CRUD operations, include data transformation,
caching, and error handling.

### Requirements

1. Create a REST API that proxies and enhances the JSONPlaceholder posts endpoint
2. Implement the following endpoints:
* GET /posts - List all posts with pagination
* GET /posts/:id - Get single post with author details
* POST /posts - Create a new post
* PATCH /posts/:id - Update a post
* DELETE /posts/:id - Delete a post
* GET /posts/search?q={term} - Search posts by title/body
3. Add request validation
4. Implement caching strategy
5. Add basic error handling
6. Write at least one unit test

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

OpenAPI documentation is available at [http://localhost:3000/api](http://localhost:3000/api)

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```
