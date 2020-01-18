import {StackProps} from "@aws-cdk/core";
import {PolicyStatement} from "@aws-cdk/aws-iam";
import {Artifact, IAction} from "@aws-cdk/aws-codepipeline";

export interface CdkCicdProps extends StackProps {
    additionalPolicyStatements?: PolicyStatement[]
    readonly buildspec?: any;
    hasLambdas?: boolean;
    readonly stackName: string;
    sourceAction(sourceArtifact: Artifact): IAction;
    createBuildSpec(): any;
}
