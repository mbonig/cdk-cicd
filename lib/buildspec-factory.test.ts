import {BuildSpecFactory} from "./buildspec-factory";

function expectCfnTemplateMatches(buildSpec: any) {
    expect(buildSpec.version).toBe("0.2");
    expect(buildSpec.artifacts.name).toBe("cfn_template");
    expect(buildSpec.artifacts.files[0]).toBe("template.json");
    expect(buildSpec.artifacts["base-directory"]).toBe("cdk.out");
    expect(buildSpec.artifacts["discard-paths"]).toBe("yes");

    expect(buildSpec.phases.install["runtime-versions"].nodejs).toBe("12");

}

test("withoutLambda doesn't setup lambda artifacts", () => {
    const buildSpec = BuildSpecFactory.withoutLambda();
    expectCfnTemplateMatches(buildSpec);
    expect(buildSpec.phases.build.commands[0]).toBe("npm install");
    expect(buildSpec.phases.build.commands[1]).toBe("npm run cdk synth");
    expect(buildSpec.phases.build.commands[2]).toBe(`mv cdk.out/*.template.json cdk.out/template.json`);
});

test("withLambda has lambda artifacts", () => {
    const buildSpec = BuildSpecFactory.withLambda();
    expectCfnTemplateMatches(buildSpec);

    expect(buildSpec.phases.build.commands[0]).toBe(`echo "you should replace this with your lambda packaging commands"`);
    expect(buildSpec.phases.build.commands[1]).toBe("npm install");
    expect(buildSpec.phases.build.commands[2]).toBe("npm run cdk synth");
    expect(buildSpec.phases.build.commands[3]).toBe(`mv cdk.out/*.template.json cdk.out/template.json`);

    expect(buildSpec.artifacts["secondary-artifacts"]["lambda_package"]["files"][0]).toBe("*.zip");
    expect(buildSpec.artifacts["secondary-artifacts"]["lambda_package"]["discard-paths"]).toBe(true);
});
