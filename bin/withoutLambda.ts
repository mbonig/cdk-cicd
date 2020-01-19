#!/usr/bin/env node
import 'source-map-support/register';
import {CdkCicd} from '../lib/cdk-cicd';
import {CfnParameter, SecretValue, Stack} from "@aws-cdk/core";
import {GitHubSourceAction} from "@aws-cdk/aws-codepipeline-actions";
import {PolicyStatement} from "@aws-cdk/aws-iam";
import cdk = require('@aws-cdk/core');
import {BuildSpecFactory} from "../lib/buildspec-factory";

const app = new cdk.App();
const stack = new Stack(app, 'cdk-cicd-without-lambda-example');
new CdkCicd(stack, 'without-lambda', {
    stackName: 'some-rando-bucket',
    sourceAction: (artifact) => new GitHubSourceAction({
            actionName: "pull-from-github",
            owner: "mbonig",
            repo: "secure-bucket",
            oauthToken: SecretValue.cfnParameter(new CfnParameter(stack, 'oauth-token', {noEcho: true})),
            output: artifact
        }
    ),
    createBuildSpec(): any {
        return BuildSpecFactory.nodejs.withoutLambda();
    },
    additionalPolicyStatements: [
        new PolicyStatement({
            actions: [
                "ec2:*Describe*"
            ],
            resources: ['*']
        })
    ]
});
