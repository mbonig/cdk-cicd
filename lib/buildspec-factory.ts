export class BuildSpecFactory {
    static withLambda() :any{
        return {
            version: '0.2',
            phases: {
                build: {
                    commands: [
                        'npm install',
                        `npm run cdk synth > template.yaml`,
                    ],
                },
            },
            artifacts: {
                'secondary-artifacts': {
                    'cfn_template': {
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
    }

    static withoutLambda() {
        return {
            version: '0.2',
            phases: {
                build: {
                    commands: [
                        'npm install',
                        `npm run cdk synth > template.yaml`,
                    ],
                },
            },
            artifacts: {
                'secondary-artifacts': {
                    'cfn_template': {
                        files: 'template.yaml'
                    }
                }
            },
        };
    }
}
