#!/usr/bin/env node
import 'source-map-support/register';
import {CdkCicd} from '../lib/cdk-cicd';
import {CfnParameter, SecretValue, Stack} from "@aws-cdk/core";
import {GitHubSourceAction} from "@aws-cdk/aws-codepipeline-actions";
import cdk = require('@aws-cdk/core');
import {PolicyStatement} from "@aws-cdk/aws-iam";

const app = new cdk.App();
const stack = new Stack(app, 'testing-stack');
new CdkCicd(stack, 'testing-project-cicd', {
    projectName: 'testing-project',
    sourceAction: (artifact) => new GitHubSourceAction({
            actionName: "pull-from-github",
            owner: "mbonig",
            repo: "secure-bucket",
            oauthToken: SecretValue.cfnParameter(new CfnParameter(stack, 'oauth-token', {noEcho: true})),
            output: artifact
        }
    ),
    createBuildSpec(): any {
        return {};
    },
    additionalPolicyStatements: [
        new PolicyStatement({
            actions: [
                "rds:ListTagsForResource",
                "rds:DescribeDBSnapshots",
                "rds:DescribeDBInstances",
                "route53:*HostedZone*",
                "ec2:*Describe*"
            ],
            resources: ['*']
        })
    ]
});
