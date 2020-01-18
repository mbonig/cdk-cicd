import {BuildSpecFactory} from "./buildspec-factory";

test("withoutLambda doesn't setup lambda artifacts", () => {
    const buildSpec = BuildSpecFactory.withoutLambda();
    expect(buildSpec.version).toBe("0.2");
    expect(buildSpec.artifacts["secondary-artifacts"]["cfn_template"]["files"]).toBe("template.yaml");
    expect(buildSpec.phases.build.commands[0]).toBe("npm install");
    expect(buildSpec.phases.build.commands[1]).toBe("npm run cdk synth > template.yaml");
});

test("withLambda has lambda artifacts", () => {
    const buildSpec = BuildSpecFactory.withLambda();
    expect(buildSpec.version).toBe("0.2");
    expect(buildSpec.artifacts["secondary-artifacts"]["lambda_package"]["files"][0]).toBe("*.zip");
    expect(buildSpec.artifacts["secondary-artifacts"]["lambda_package"]["discard-paths"]).toBe(true);
    expect(buildSpec.phases.build.commands[0]).toBe("npm install");
    expect(buildSpec.phases.build.commands[1]).toBe("npm run cdk synth > template.yaml");
});
