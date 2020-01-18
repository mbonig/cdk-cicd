import {Construct} from '@aws-cdk/core';
import {Artifact, IAction, Pipeline} from '@aws-cdk/aws-codepipeline';
import {
    CloudFormationCreateUpdateStackAction,
    CodeBuildAction,
    S3DeployAction
} from '@aws-cdk/aws-codepipeline-actions';
import {
    BuildEnvironmentVariableType,
    BuildSpec,
    ComputeType,
    LinuxBuildImage,
    PipelineProject
} from '@aws-cdk/aws-codebuild';
import {Bucket} from '@aws-cdk/aws-s3';
import {CloudFormationCapabilities} from '@aws-cdk/aws-cloudformation';
import {PolicyStatement} from "@aws-cdk/aws-iam";

export class CdkCicd extends Construct {
    codePipeline: Pipeline | undefined;

    constructor(scope: Construct, id: string, props: ICdkCicdProps) {
        super(scope, id);

        const useLambda = props.hasLambdas || false;

        let s3DeployAction: S3DeployAction;
        const lambdaBucket = new Bucket(this, `${id}-artifact-bucket`, {versioned: true});
        const sourceCode = new Artifact("source");
        const deployArtifacts = new Artifact('cfn_template');
        const lambdaPackage = new Artifact('lambda_package');


        let environmentVariables: any = {};
        if (useLambda) {
            environmentVariables.S3_LAMBDA_BUCKET = {
                type: BuildEnvironmentVariableType.PLAINTEXT,
                value: lambdaBucket.bucketName
            };
        }
        let buildSpec = props.createBuildSpec();
        if (buildSpec.artifacts.name !== "cfn_template") {
            throw new Error("Please provide a BuildSpec that has an .artifacts.name value of 'cfn_template'.");
        }
        if (!buildSpec.artifacts.files || !buildSpec.artifacts.files.length) {
            throw new Error("Please provide a BuildSpec that has an .artifacts.files value.");
        }

        if (props.hasLambdas && !buildSpec.artifacts["secondary-artifacts"].lambda_package) {
            throw new Error("Please provide a BuildSpec that has an .artifacts.secondary-artifacts.lambda_package value when hasLambdas is true.");
        } else if (props.hasLambdas && !buildSpec.artifacts["secondary-artifacts"].lambda_package.files) {
            throw new Error("Please provide a BuildSpec that has an .artifacts.secondary-artifacts.lambda_package.files value when hasLambdas is true.");
        }
        const project = new PipelineProject(this, `${id}-build-project`, {
            buildSpec: BuildSpec.fromObject(buildSpec),
            environment: {
                buildImage: LinuxBuildImage.AMAZON_LINUX_2_2,
                computeType: ComputeType.SMALL,
                privileged: true,
                environmentVariables: environmentVariables
            }
        });

        let codeBuildOutputs = [deployArtifacts];
        if (useLambda) {
            codeBuildOutputs.push(lambdaPackage);
        }
        const codeBuildAction = new CodeBuildAction({
            actionName: 'build',
            input: sourceCode,
            outputs: codeBuildOutputs,
            project
        });

        if (props.additionalPolicyStatements) {
            for (const policyStatement of props.additionalPolicyStatements) {
                project.addToRolePolicy(policyStatement);
            }
        }

        if (useLambda) {
            s3DeployAction = new S3DeployAction({
                actionName: 'copy-lambdas',
                bucket: lambdaBucket!,
                input: lambdaPackage,
                runOrder: 1
            });
        }

        const updateAPIStackAction = new CloudFormationCreateUpdateStackAction({
            actionName: 'deploy',
            templatePath: deployArtifacts.atPath("template.json"),
            adminPermissions: true,
            stackName: `${props.stackName}`,
            capabilities: [CloudFormationCapabilities.NAMED_IAM],
            runOrder: 2
        });

        let sourceAction = props.sourceAction(sourceCode);
        if (!sourceAction) {
            throw new Error("Please provide a sourceAction that returns an IAction pointing at the source CDK module.")
        }
        let [outputArtifact] = sourceAction.actionProperties.outputs!;
        if (outputArtifact && outputArtifact !== sourceCode) {
            throw new Error("Please provide a sourceAction that uses the provided sourceArtifact.");
        }

        let deployActions: IAction[] = [
            updateAPIStackAction
        ];
        if (useLambda) {
            deployActions.unshift(s3DeployAction!);
        }
        this.codePipeline = new Pipeline(this, `${id}-pipeline`, {
            artifactBucket: lambdaBucket,
            stages: [
                {
                    stageName: "Source",
                    actions: [sourceAction]
                },
                {
                    stageName: 'backup-and-build',
                    actions: [codeBuildAction]
                },
                {
                    stageName: 'Deploy',
                    actions: deployActions
                }
            ]
        });
    }
}

export interface ICdkCicdProps {
    additionalPolicyStatements?: PolicyStatement[]
    readonly buildspec?: any;
    hasLambdas?: boolean;
    readonly stackName: string;

    sourceAction(sourceArtifact: Artifact): IAction;

    createBuildSpec(): any;
}



