import {Construct, StackProps} from '@aws-cdk/core';
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
import {PolicyStatement} from '@aws-cdk/aws-iam';

export class CdkCicd extends Construct {
    codePipeline: Pipeline | undefined;

    constructor(scope: Construct, id: string, props: CdkCicdProps) {
        super(scope, id);

        this.setupCodepipeline(props);

    }

    setupCodepipeline(props: CdkCicdProps) {

        const useLambda = props.hasLambdas || false;

        let s3DeployAction: S3DeployAction;
        const lambdaBucket = new Bucket(this, `${props.projectName}-artifact-bucket`, {versioned: true});
        const sourceCode = new Artifact("source");
        const deployArtifacts = new Artifact('cfn_templates');
        const lambdaPackage = new Artifact('lambda_package');


        let environmentVariables: any = {};
        if (useLambda) {
            environmentVariables.S3_LAMBDA_BUCKET = {
                type: BuildEnvironmentVariableType.PLAINTEXT,
                value: lambdaBucket.bucketName
            };
        }
        const project = new PipelineProject(this, `${props.projectName}-build-project`, {
            buildSpec: BuildSpec.fromObject(props.createBuildSpec()),
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
            templatePath: deployArtifacts.atPath('template.yaml'),
            adminPermissions: true,
            stackName: `${props.projectName}`,
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
        this.codePipeline = new Pipeline(this, `${props.projectName}-pipeline`, {
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

    createBuildSpec(): { [key: string]: any; } {
        const PASSTHROUGH_BUILDSPEC: any = {
            version: '0.2',
            phases: {
                install: {
                    commands: [
                        "npm i -g aws-cdk@1.20.0",
                        "cdk --version"
                    ]
                },
                build: {
                    commands: [
                        'env',
                        'npm i',
                        'cd lib/handlers && npm i && zip -r ../../lambda.zip * && cd ../..',
                        'npm run build',
                        "HASH=$(md5sum lambda.zip | awk '{ print $1 }')",
                        'mv lambda.zip $HASH.zip',
                        `cdk synth -c s3_deploy_bucket=$S3_LAMBDA_BUCKET -c lambda_hash=$HASH > template.yaml`,
                        'cat template.yaml'
                    ],
                },
            },
            artifacts: {
                'secondary-artifacts': {
                    'cfn_templates': {
                        files: 'template.yaml'
                    },
                    lambda_package: {
                        files: [
                            "*.zip"
                        ],
                        "discard-paths": true
                    }
                }
            },
        };
        return PASSTHROUGH_BUILDSPEC;
    }
}

export interface CdkCicdProps extends StackProps {
    additionalPolicyStatements?: PolicyStatement[]
    readonly buildspec?: any;
    hasLambdas?: boolean;
    readonly projectName: string;

    sourceAction(sourceArtifact: Artifact): IAction;

    createBuildSpec(): any;
}


