#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import {CdkCicd} from '../lib/cdk-cicd';

const app = new cdk.App();
new CdkCicd(app, 'testing-project-cicd', {
    projectName: 'testing-project'
});
