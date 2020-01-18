import {Construct, StackProps} from '@aws-cdk/core';
import {Pipeline, Artifact, IAction} from '@aws-cdk/aws-codepipeline';
import {
    CodeBuildAction,
    S3DeployAction,
    CloudFormationCreateUpdateStackAction,
    CodeCommitSourceAction,
    CodeCommitTrigger
} from '@aws-cdk/aws-codepipeline-actions';
import targets = require('@aws-cdk/aws-events-targets');
import events = require('@aws-cdk/aws-events');
import {
    PipelineProject,
    BuildSpec,
    LinuxBuildImage,
    ComputeType,
    BuildEnvironmentVariableType
} from '@aws-cdk/aws-codebuild';
import {Bucket} from '@aws-cdk/aws-s3';
import {CloudFormationCapabilities} from '@aws-cdk/aws-cloudformation';
import {Repository} from '@aws-cdk/aws-codecommit';
import {PolicyStatement} from '@aws-cdk/aws-iam';

export class CdkCicd extends Construct {
    codePipeline: Pipeline | undefined;

    constructor(scope: Construct, id: string, props: CdkCicdProps) {
        super(scope, id);

        this.setupCodepipeline(props);

    }

    setupCodepipeline(props: CdkCicdProps) {

        const lambdaBucket = new Bucket(this, `${props.projectName}-artifact-bucket`, {versioned: true});
        const sourceCode = new Artifact("source");
        const deployArtifacts = new Artifact('cfn_templates');
        const lambdaPackage = new Artifact('lambda_package');

        const project = new PipelineProject(this, `${props.projectName}-build-project`, {
            buildSpec: BuildSpec.fromObject(this.createBuildSpec()),
            environment: {
                buildImage: LinuxBuildImage.AMAZON_LINUX_2_2,
                computeType: ComputeType.SMALL,
                privileged: true,
                environmentVariables: {
                    "S3_LAMBDA_BUCKET": {type: BuildEnvironmentVariableType.PLAINTEXT, value: lambdaBucket.bucketName}
                }
            }
        });

        const codeBuildAction = new CodeBuildAction({
            actionName: 'build',
            input: sourceCode,
            outputs: [deployArtifacts, lambdaPackage],
            project
        });

        project.addToRolePolicy(new PolicyStatement({
            actions: [
                "rds:ListTagsForResource",
                "rds:DescribeDBSnapshots",
                "rds:DescribeDBInstances",
                "route53:*HostedZone*",
                "ec2:*Describe*"
            ],
            resources: ['*']
        }));

        const s3DeployAction = new S3DeployAction({
            actionName: 'copy-lambdas',
            bucket: lambdaBucket,
            input: lambdaPackage,
            runOrder: 1
        });

        const updateAPIStackAction = new CloudFormationCreateUpdateStackAction({
            actionName: 'deploy',
            templatePath: deployArtifacts.atPath('template.yaml'),
            adminPermissions: true,
            stackName: `${props.projectName}`,
            capabilities: [CloudFormationCapabilities.NAMED_IAM],
            runOrder: 2
        });

        const codeCommitAction = new CodeCommitSourceAction({
            actionName: "clone",
            repository: Repository.fromRepositoryName(this, 'code-repo', "analytics-dbs"),
            output: sourceCode,
            trigger: CodeCommitTrigger.NONE
        });

        this.codePipeline = new Pipeline(this, `${props.projectName}-pipeline`, {
            artifactBucket: lambdaBucket,
            stages: [
                {
                    stageName: "Source",
                    actions: [codeCommitAction]
                },
                {
                    stageName: 'backup-and-build',
                    actions: [codeBuildAction]
                },
                {
                    stageName: 'Deploy',
                    actions: [
                        s3DeployAction,
                        updateAPIStackAction
                    ]
                }
            ]
        });

        const rule = new events.Rule(this, 'Daily', {
            schedule: events.Schedule.cron({hour: "4", minute: "0"}),
        });

        rule.addTarget(new targets.CodePipeline(this.codePipeline));
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
    readonly projectName: string;
    readonly sourceAction?: IAction;
    readonly buildspec?: any;
}


