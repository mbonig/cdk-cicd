#!/usr/bin/env node
import 'source-map-support/register';
import {CdkCicd} from '../lib/cdk-cicd';
import {CfnParameter, SecretValue, Stack} from "@aws-cdk/core";
import {GitHubSourceAction} from "@aws-cdk/aws-codepipeline-actions";
import {PolicyStatement} from "@aws-cdk/aws-iam";
import {BuildSpecFactory} from "../lib/buildspec-factory";
import cdk = require('@aws-cdk/core');

const app = new cdk.App();
const stack = new Stack(app, 'cdk-cicd-with-lambda-example');
new CdkCicd(stack, 'with-lambda', {
    stackName: 'some-rando-bucket',
    hasLambdas: true,
    sourceAction: (artifact) => new GitHubSourceAction({
            actionName: "pull-from-github",
            owner: "mbonig",
            repo: "secure-bucket",
            oauthToken: SecretValue.cfnParameter(new CfnParameter(stack, 'oauth-token', {noEcho: true})),
            output: artifact
        }
    ),
    createBuildSpec(): any {
        const withLambda = BuildSpecFactory.nodejs.withLambda();

        // this will be specific to the CDK module pulled in the souceAction above
        // and should produce a .zip file in the root directory
        withLambda.phases.build.commands[0] = "npm run lambda:build";

        // if your lambda build process is more complex then you may want to construct a BuildSpec from scratch

        return withLambda;
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
