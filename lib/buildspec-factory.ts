export class BuildSpecFactory {
    static withLambda(): any {
        return {
            version: '0.2',
            phases: {
                install: {
                    "runtime-versions": {
                        "nodejs": "12"
                    }
                },
                build: {
                    commands: [
                        `echo "you should replace this with your lambda packaging commands"`,
                        'npm install',
                        `npm run cdk synth`,
                        `mv cdk.out/*.template.json cdk.out/template.json`
                    ],
                },
            },
            artifacts: {
                files: ["template.json"],
                "base-directory": "cdk.out",
                "discard-paths": "yes",
                name: "cfn_template",
                'secondary-artifacts': {
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
                install: {
                    "runtime-versions": {
                        "nodejs": "12"
                    }
                },
                build: {
                    commands: [
                        'npm install',
                        `npm run cdk synth`,
                        `mv cdk.out/*.template.json cdk.out/template.json`
                    ],
                },
            },
            artifacts: {
                files: ["template.json"],
                "base-directory": "cdk.out",
                "discard-paths": "yes",
                name: "cfn_template"
            }
        };
    }
}
