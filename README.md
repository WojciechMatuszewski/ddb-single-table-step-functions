# _Amazon DynamoDB_ single-table design with _AWS Step Functions_

An example of how one might create APIs backed by [_Amazon API Gateway_](https://aws.amazon.com/api-gateway/), [_AWS Step Functions_](https://aws.amazon.com/step-functions/) while utilizing the _Amazon DynamoDB_ as a data layer in [_single-table_](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/) methodology.

Please note that **this is only an example**. I would suggest ensuring that every step in the _state machine_ has some kind of _Catch_ state defined for production usage.

## The data model

The data model represents the 1:n relation between a cat and its owner. The owner can have multiple cats. The cat can have only a single owner.

## Deployment

1. `npm run install`
1. `npm run bootstrap`
1. `npm run deploy`

## Playing around

The API consist of four routes.

- POST `${APIGW_URL}/owner`

- GET `${APIGW_URL}/owner/${OWNER_ID}`

- POST `${APIGW_URL}/owner/${OWNER_ID}/cat`

- GET `${APIGW_URL}/owner/${OWNER_ID}/cats`

## Learnings

- Splitting strings is impossible with [_JsonPath_](https://github.com/json-path/JsonPath). _JsonPath_ is used in _AWS Step Functions_ for expression evaluation.

  - This might be especially limiting while overloading _Amazon DynamoDB_ indexes.

  - Consider storing the values you overload the indexes with as separate attributes. You should be able to retrieve them later on while performing various transformations.

- On the other hand, concatenating values is relatively hassle-free. One has to use the `States.Format` [_intrinsic function_](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-intrinsic-functions.html).

- When deploying with more complex indexing schemes, you will most likely need to employ an _AWS Lambda_ function for data transformation – going from _Amazon DynamoDB_ item to your API item.

  - Such tools exist – like the [Stedi Mappings](https://www.stedi.com/docs/mappings) that I've helped to build :)
