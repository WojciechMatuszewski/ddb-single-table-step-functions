import {
  aws_apigateway,
  aws_dynamodb,
  aws_iam,
  aws_logs,
  aws_stepfunctions,
  aws_stepfunctions_tasks,
  RemovalPolicy,
  Stack,
  StackProps
} from "aws-cdk-lib";
import * as constants from "cdk-constants";
import { Construct } from "constructs";

export class CodeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dataTable = new aws_dynamodb.Table(this, "DataTable", {
      partitionKey: {
        name: "PK",
        type: aws_dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: "SK",
        type: aws_dynamodb.AttributeType.STRING
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST
    });

    /**
     * === Create Owner ===
     */
    const isCreateOwnerCondition = aws_stepfunctions.Condition.and(
      aws_stepfunctions.Condition.stringEquals(
        "$.requestContext.resourcePath",
        "/owner"
      ),
      aws_stepfunctions.Condition.stringEquals(
        "$.requestContext.httpMethod",
        "POST"
      )
    );
    const transformToCreateOwnerPayload = new aws_stepfunctions.Pass(
      this,
      "TransformToCreateOwnerPayload",
      {
        inputPath: "$",
        parameters: {
          name: aws_stepfunctions.JsonPath.stringAt("$.body.name"),
          surname: aws_stepfunctions.JsonPath.stringAt("$.body.surname"),
          id: aws_stepfunctions.JsonPath.stringAt("$.requestContext.requestId"),
          createdAt: aws_stepfunctions.JsonPath.stringAt(
            "$$.Execution.StartTime"
          )
        }
      }
    );
    const saveOwnerToDataTableTask = new aws_stepfunctions_tasks.DynamoPutItem(
      this,
      "SaveOwnerToDataTableTask",
      {
        item: {
          PK: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt(
              "States.Format('OWNER#{}', $.id)"
            )
          ),
          SK: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt(
              "States.Format('OWNER#{}', $.id)"
            )
          ),
          createdAt: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.createdAt")
          ),
          name: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.name")
          ),
          surname: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.surname")
          ),
          id: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.id")
          )
        },
        table: dataTable,
        resultPath: aws_stepfunctions.DISCARD
      }
    );
    const transformSaveOwnerResponse = new aws_stepfunctions.Pass(
      this,
      "TransformSaveOwnerResponse",
      {
        inputPath: "$",
        parameters: {
          id: aws_stepfunctions.JsonPath.stringAt("$.id"),
          createdAt: aws_stepfunctions.JsonPath.stringAt("$.createdAt"),
          name: aws_stepfunctions.JsonPath.stringAt("$.name"),
          surname: aws_stepfunctions.JsonPath.stringAt("$.surname")
        }
      }
    );
    const createOwner = transformToCreateOwnerPayload
      .next(saveOwnerToDataTableTask)
      .next(transformSaveOwnerResponse);

    /**
     * === Get Owner ===
     */
    const isGetOwnerCondition = aws_stepfunctions.Condition.and(
      aws_stepfunctions.Condition.stringEquals(
        "$.requestContext.resourcePath",
        "/owner/{id}"
      ),
      aws_stepfunctions.Condition.stringEquals(
        "$.requestContext.httpMethod",
        "GET"
      ),
      aws_stepfunctions.Condition.isPresent("$.path.id")
    );
    const transformToGetOwnerPayload = new aws_stepfunctions.Pass(
      this,
      "TransformToGetOwnerPayload",
      {
        inputPath: "$",
        parameters: {
          id: aws_stepfunctions.JsonPath.stringAt("$.path.id")
        }
      }
    );
    const getOwnerFromDataTableTask = new aws_stepfunctions_tasks.DynamoGetItem(
      this,
      "GetOwnerFromDataTableTask",
      {
        table: dataTable,
        key: {
          PK: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt(
              "States.Format('OWNER#{}', $.id)"
            )
          ),
          SK: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt(
              "States.Format('OWNER#{}', $.id)"
            )
          )
        }
      }
    );
    const transformGetOwnerResponse = new aws_stepfunctions.Pass(
      this,
      "TransformGetOwnerResponse",
      {
        inputPath: "$",
        parameters: {
          owner: aws_stepfunctions.JsonPath.stringAt("$.Item")
        },
        outputPath: aws_stepfunctions.JsonPath.stringAt("$.owner")
      }
    );
    const getOwner = transformToGetOwnerPayload
      .next(getOwnerFromDataTableTask)
      .next(transformGetOwnerResponse);

    /**
     * === Create Cat ===
     */
    const isCreateCatCondition = aws_stepfunctions.Condition.and(
      aws_stepfunctions.Condition.stringEquals(
        "$.requestContext.resourcePath",
        "/owner/{id}/cat"
      ),
      aws_stepfunctions.Condition.stringEquals(
        "$.requestContext.httpMethod",
        "POST"
      )
    );
    const transformToCreateCatPayload = new aws_stepfunctions.Pass(
      this,
      "TransformToCreateCatPayload",
      {
        inputPath: "$",
        parameters: {
          id: aws_stepfunctions.JsonPath.stringAt("$.requestContext.requestId"),
          ownerId: aws_stepfunctions.JsonPath.stringAt("$.path.id"),
          name: aws_stepfunctions.JsonPath.stringAt("$.body.name"),
          breed: aws_stepfunctions.JsonPath.stringAt("$.body.breed"),
          createdAt: aws_stepfunctions.JsonPath.stringAt(
            "$$.Execution.StartTime"
          )
        }
      }
    );
    const saveCatToDataTableTask = new aws_stepfunctions_tasks.DynamoPutItem(
      this,
      "SaveCatToDataTableTask",
      {
        table: dataTable,
        item: {
          PK: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt(
              "States.Format('OWNER#{}', $.ownerId)"
            )
          ),
          SK: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            /**
             * Depending on your needs, having the `createdAt` append to the SK might not be a good idea.
             * One alternative to consider here would be to be GSI and leave the SK in a format of `CAT#CAT_ID`.
             */
            aws_stepfunctions.JsonPath.stringAt(
              "States.Format('CAT#{}#{}', $.id, $.createdAt)"
            )
          ),
          createdAt: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.createdAt")
          ),
          name: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.name")
          ),
          breed: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.breed")
          )
        },
        resultPath: aws_stepfunctions.JsonPath.DISCARD
      }
    );
    const transformToCat = new aws_stepfunctions.Pass(this, "TransformToCat", {
      inputPath: "$",
      parameters: {
        id: aws_stepfunctions.JsonPath.stringAt("$.id"),
        createdAt: aws_stepfunctions.JsonPath.stringAt("$.createdAt"),
        name: aws_stepfunctions.JsonPath.stringAt("$.name"),
        breed: aws_stepfunctions.JsonPath.stringAt("$.breed")
      }
    });
    const createCat = transformToCreateCatPayload
      .next(saveCatToDataTableTask)
      .next(transformToCat);

    /**
     * === Get Owner Cats ===
     */
    const isGetCatsCondition = aws_stepfunctions.Condition.and(
      aws_stepfunctions.Condition.stringEquals(
        "$.requestContext.resourcePath",
        "/owner/{id}/cats"
      ),
      aws_stepfunctions.Condition.stringEquals(
        "$.requestContext.httpMethod",
        "GET"
      )
    );
    const transformToGetCatsPayload = new aws_stepfunctions.Pass(
      this,
      "TransformToGetCatsPayload",
      {
        parameters: {
          ownerId: aws_stepfunctions.JsonPath.stringAt("$.path.id")
        }
      }
    );
    /**
     * The `aws_stepfunctions_tasks` does not expose the `DynamoQuery` class.
     * Thankfully, the native SDK integration allows us to perform that operation.
     */
    const getCatsFromDataTableTask = new aws_stepfunctions_tasks.CallAwsService(
      this,
      "GetCatsFromDataTableTask",
      {
        service: "dynamodb",
        action: "query",
        parameters: {
          TableName: dataTable.tableName,
          KeyConditionExpression: "PK = :PK AND begins_with(SK, :SK)",
          /**
           * We cannot use `DynamoAttributeValue` here.
           * The `CallAwsService` construct is incompatible with the `DynamoAttributeValue` class.
           */
          ExpressionAttributeValues: {
            ":PK": {
              "S.$": "States.Format('OWNER#{}', $.ownerId)"
            },
            ":SK": {
              S: "CAT#"
            }
          },
          ScanIndexForward: false
        },
        iamResources: [dataTable.tableArn]
      }
    );
    const transformGetCatsResponse = new aws_stepfunctions.Pass(
      this,
      "TransformGetCatsResponse",
      {
        inputPath: "$",
        parameters: {
          cats: aws_stepfunctions.JsonPath.stringAt("$.Items")
        },
        outputPath: aws_stepfunctions.JsonPath.stringAt("$.cats")
      }
    );
    const getCats = transformToGetCatsPayload
      .next(getCatsFromDataTableTask)
      .next(transformGetCatsResponse);

    /**
     * === Step Function and API ===
     */
    const machineDefinition = new aws_stepfunctions.Choice(
      this,
      "OperationRouter"
    )
      .when(isCreateOwnerCondition, createOwner)
      .when(isGetOwnerCondition, getOwner)
      .when(isCreateCatCondition, createCat)
      .when(isGetCatsCondition, getCats)
      .otherwise(new aws_stepfunctions.Fail(this, "UnmappedRoute", {}));

    const stateMachineLogGroup = new aws_logs.LogGroup(
      this,
      "StateMachineLogGroup",
      {
        removalPolicy: RemovalPolicy.DESTROY,
        retention: aws_logs.RetentionDays.ONE_DAY
      }
    );

    const machine = new aws_stepfunctions.StateMachine(this, "StateMachine", {
      definition: machineDefinition,
      stateMachineType: aws_stepfunctions.StateMachineType.EXPRESS,
      logs: {
        destination: stateMachineLogGroup,
        level: aws_stepfunctions.LogLevel.ALL
      }
    });

    const allowSFNInvokeRole = new aws_iam.Role(this, "AllowSFNInvokeRole", {
      assumedBy: new aws_iam.ServicePrincipal(
        constants.ServicePrincipals.API_GATEWAY
      ),
      inlinePolicies: {
        allowSFNInvoke: new aws_iam.PolicyDocument({
          statements: [
            new aws_iam.PolicyStatement({
              actions: ["states:StartSyncExecution"],
              resources: [machine.stateMachineArn],
              effect: aws_iam.Effect.ALLOW
            })
          ]
        })
      }
    });

    const apiAccessLogsLogGroup = new aws_logs.LogGroup(
      this,
      "ApiAccessLogsLogGroup",
      {
        removalPolicy: RemovalPolicy.DESTROY,
        retention: aws_logs.RetentionDays.ONE_DAY
      }
    );

    const api = new aws_apigateway.RestApi(this, "Api", {
      deployOptions: {
        loggingLevel: aws_apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new aws_apigateway.LogGroupLogDestination(
          apiAccessLogsLogGroup
        )
      },
      defaultCorsPreflightOptions: {
        allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
        allowMethods: aws_apigateway.Cors.ALL_METHODS,
        allowHeaders: aws_apigateway.Cors.DEFAULT_HEADERS,
        allowCredentials: true
      }
    });

    const catOwnerRootResource = api.root.addResource("owner");
    catOwnerRootResource.addMethod(
      "POST",
      aws_apigateway.StepFunctionsIntegration.startExecution(machine, {
        credentialsRole: allowSFNInvokeRole,
        requestContext: {
          httpMethod: true,
          resourcePath: true,
          requestId: true
        }
      }),
      {
        methodResponses: [{ statusCode: "200" }]
      }
    );

    const catOwnerResource = catOwnerRootResource.addResource("{id}");
    catOwnerResource.addMethod(
      "GET",
      aws_apigateway.StepFunctionsIntegration.startExecution(machine, {
        credentialsRole: allowSFNInvokeRole,
        path: true,
        requestContext: {
          httpMethod: true,
          resourcePath: true,
          requestId: true
        }
      }),
      {
        methodResponses: [
          {
            statusCode: "200"
          }
        ]
      }
    );

    const ownersCatResource = catOwnerResource.addResource("cat");
    ownersCatResource.addMethod(
      "POST",
      aws_apigateway.StepFunctionsIntegration.startExecution(machine, {
        credentialsRole: allowSFNInvokeRole,
        path: true,
        requestContext: {
          httpMethod: true,
          resourcePath: true,
          requestId: true
        }
      }),
      {
        methodResponses: [
          {
            statusCode: "200"
          }
        ]
      }
    );

    const ownersCatsResource = catOwnerResource.addResource("cats");
    ownersCatsResource.addMethod(
      "GET",
      aws_apigateway.StepFunctionsIntegration.startExecution(machine, {
        credentialsRole: allowSFNInvokeRole,
        path: true,
        requestContext: {
          httpMethod: true,
          resourcePath: true,
          requestId: true
        }
      }),
      {
        methodResponses: [
          {
            statusCode: "200"
          }
        ]
      }
    );
  }
}
