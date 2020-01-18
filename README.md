# CDK CodePipeline Stack

The purpose of this Construct is to build a CodePipeline stack that builds and deploys a CDK Stack.

## Usage

Refer to the [bin/automation.ts](bin/automation.ts) for an example.

## Properties
| prop | description | usage 
| --- | --- | ---
| stackName | The CloudFormation Stack to create/update | must be a valid CFN stack name (e.g. some-stack-name) 
| sourceAction | The Source IAction for CodePipeline | Rather than try to account for all source situations, you just provide your own. The factory function is given the Artifact to use as the output target in your Action
| createBuildSpec | A Factory that returns a BuildSpec object to use | Refer to the [lib/buildspec-factory.ts] for creating these
| additionalPolicyStatements | Any additional PolicyStatements you'd like to add to the CodeBuild project Role | Useful if you're going to be making AWS API calls from within your CDK 'synth' process during the build.

## Contribute

Always open to any suggestions or help in making this better. Open an Issue.

## License

MIT
